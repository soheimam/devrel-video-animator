#!/usr/bin/env node
// One job, start to finish, in whatever machine runs it (a Vercel Sandbox, or your laptop):
// fetch the recording → transcribe and capture frames → the agent suggests (or applies picks)
// → render → upload the outputs → write the review. Progress goes to the store as it happens,
// so the web page can follow along.
//
// Usage:
//   node scripts/job.mjs --id <job-id>                        # store mode (Blob on Vercel, .jobs/ locally)
//   node scripts/job.mjs --local videos/<file>.mp4 [--notes "…"] [--from-out out/<existing>] [--no-agent]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, slugFor } from '../lib/paths.js';
import { createStore, readState, writeState, newJobId } from '../lib/store.js';
import { buildReview } from '../lib/review.js';
import { probe } from '../lib/ffmpeg.js';
import { writeJson } from '../lib/files.js';
import { isMain, parseArgs } from '../lib/cli.js';

const TEXT_OUTPUTS = ['edits.yaml', 'report.md', 'source.json', 'transcript.json', 'transcript.md', 'captions.srt', 'captions.vtt', 'validation.json'];

async function download(url, file) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Could not fetch the recording (${res.status}).`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

export async function runJob(id, { store = createStore(), log = console.log, agent = true } = {}) {
  const job = await store.getJson(`jobs/${id}/job.json`);
  if (!job) throw new Error(`No job ${id}`);
  const round = job.rounds[job.rounds.length - 1];
  const name = job.name;
  const outDir = path.join(ROOT, 'out', name);
  // A recording already on this machine (a local run) is used where it is; anything else is
  // fetched to videos/<name>.mp4. No copies left behind in videos/.
  const local = job.sourceUrl.startsWith('file://') ? fileURLToPath(job.sourceUrl) : null;
  const video = local && fs.existsSync(local) ? local : path.join(ROOT, 'videos', `${name}.mp4`);
  const events = [];
  let current = 'starting';
  // Which pipeline this machine is actually running, recorded on every update.
  let commit = 'unknown';
  try {
    const { execFileSync } = await import('node:child_process');
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch { /* not a git checkout */ }
  const state = async (status, extra = {}) => {
    log(`job ${id}: ${status}${extra.message ? ' · ' + extra.message : ''}`);
    if (!['done', 'failed'].includes(status)) current = status;
    return writeState(store, id, { status, round: round.n, mode: round.mode, commit, log: events.slice(-30), ...extra });
  };
  const onEvent = (e) => events.push(e);

  try {
    await state('fetching', { message: 'getting the recording' });
    if (!fs.existsSync(video)) {
      if (local) fs.copyFileSync(local, video);
      else await download(job.sourceUrl, video);
    }

    if (round.n > 1) {
      await state('restoring', { message: `picking up round ${round.n - 1}` });
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of TEXT_OUTPUTS) {
        try { await store.getFile(`jobs/${id}/r${round.n - 1}/${f}`, path.join(outDir, f)); } catch { /* optional */ }
      }
      const { captureFrames } = await import('./frames.mjs');
      await captureFrames(outDir, { log });
    } else if (fs.existsSync(path.join(outDir, 'transcript.json'))) {
      const { captureFrames } = await import('./frames.mjs');
      await captureFrames(outDir, { log });
    } else {
      await state('transcribing', { message: 'transcript and frames' });
      const { ingest } = await import('./ingest.mjs');
      await ingest(video, { out: outDir, log });
    }

    if (agent) {
      await state(round.mode === 'picks' ? 'applying' : 'suggesting', { message: round.mode === 'picks' ? 'applying your picks' : 'reading the transcript and the frames' });
      const { runAgent } = await import('./agent.mjs');
      const r = await runAgent({ name, mode: round.mode, notes: job.notes, picks: round.picks, onEvent, log });
      round.summary = r.summary;
    }

    const edits = path.join(outDir, 'edits.yaml');
    if (!fs.existsSync(edits)) throw new Error('The agent did not write an edit list.');
    const edited = path.join(outDir, 'edited.mp4');
    if (!fs.existsSync(edited) || fs.statSync(edited).mtimeMs < fs.statSync(edits).mtimeMs) {
      await state('rendering', { message: 'overlays, captions, previews' });
      const { render } = await import('./render.mjs');
      await render(outDir, { log });
    }

    await state('publishing', { message: 'uploading the video and previews' });
    const prefix = `jobs/${id}/r${round.n}`;
    const urls = {};
    const upload = async (rel) => {
      const full = path.join(outDir, rel);
      if (fs.existsSync(full)) urls[rel] = await store.putFile(`${prefix}/${rel}`, full);
    };
    for (const f of ['edited.mp4', ...TEXT_OUTPUTS]) await upload(f);
    const previewDir = path.join(outDir, 'preview');
    if (fs.existsSync(previewDir)) for (const f of fs.readdirSync(previewDir)) if (/\.(gif|jpg)$/.test(f)) await upload(`preview/${f}`);
    const review = buildReview(outDir, (rel) => urls[rel] || null, { round: round.n });
    review.summary = round.summary || null;
    await store.putJson(`${prefix}/review.json`, review);
    job.rounds[job.rounds.length - 1] = { ...round, finishedAt: new Date().toISOString() };
    await store.putJson(`jobs/${id}/job.json`, job);
    await state('done', { message: 'ready to review', review });
    return review;
  } catch (e) {
    const plain = (t) => String(t).replace(/\x1b\[[0-9;]*m/g, '');
    // Gateway errors carry the HTTP status, a generation id and the provider's own reason.
    const detail = [`pipeline commit ${commit}`];
    if (e.statusCode) detail.push(`status ${e.statusCode}`);
    if (e.generationId) detail.push(`generation ${e.generationId}`);
    const cause = e.cause;
    if (cause) detail.push(`cause: ${plain(cause.responseBody || cause.message || JSON.stringify(cause)).slice(0, 1500)}`);
    if (process.env.AGENT_MODEL) detail.push(`AGENT_MODEL=${process.env.AGENT_MODEL}`);
    if (e.probes) detail.push('probes:', ...e.probes);
    const where = { fetching: 'getting the recording', restoring: 'restoring the last round', transcribing: 'transcribing', suggesting: 'suggesting (the model call)', applying: 'applying your picks (the model call)', rendering: 'rendering', publishing: 'publishing' }[current] || current;
    await state('failed', { message: `Failed while ${where}: ${plain(e.message).split('\n')[0].slice(0, 280)}`, error: [detail.join('\n'), plain(e.stack || e)].filter(Boolean).join('\n\n').slice(0, 5000) });
    throw e;
  }
}

// Local run: creates a job in the local store from a file on disk, then runs it.
export async function runLocal(videoPath, { notes = '', fromOut = null, agent = true, log = console.log } = {}) {
  const store = createStore({ JOBS_DIR: path.join(ROOT, '.jobs') });
  const name = slugFor(videoPath);
  const id = newJobId();
  const target = path.resolve(videoPath);
  const source = await probe(target);
  await store.putJson(`jobs/${id}/job.json`, { id, name, sourceUrl: `file://${target}`, notes, createdAt: new Date().toISOString(), duration: source.duration, rounds: [{ n: 1, mode: 'suggest', picks: null }] });
  if (fromOut) {
    const outDir = path.join(ROOT, 'out', name);
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of ['edits.yaml', 'transcript.json', 'transcript.md']) if (fs.existsSync(path.join(fromOut, f))) fs.copyFileSync(path.join(fromOut, f), path.join(outDir, f));
    writeJson(path.join(outDir, 'source.json'), { ...source, path: path.relative(ROOT, target) });
  }
  await writeState(store, id, { status: 'queued', round: 1, mode: 'suggest' });
  const review = await runJob(id, { store, log, agent });
  log(`\nlocal job ${id} done: ${review.beats.length} beats · open the web app at /jobs/${id}`);
  return { id, review };
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const run = flags.id
    ? flags.fail
      ? writeState(createStore(), flags.id, { status: 'failed', message: `The sandbox could not start: ${flags.fail}` })
      : runJob(flags.id)
    : flags.local
      ? runLocal(flags.local, { notes: flags.notes || '', fromOut: flags['from-out'] || null, agent: !flags['no-agent'] })
      : Promise.reject(new Error('Usage: node scripts/job.mjs --id <job-id> | --local videos/<file>.mp4 [--from-out out/<x>] [--no-agent]'));
  run.catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
