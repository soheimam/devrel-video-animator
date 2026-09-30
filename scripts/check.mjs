#!/usr/bin/env node
// Checks the rendered video, not the plan: duration matches the cuts, and a still frame is
// pulled for every cue and both sides of every cut so the checker agent can look at them.
// Writes check.json and check/*.jpg.
//
// Usage: node scripts/check.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml, writeJson } from '../lib/files.js';
import { normalizeEdl, mapTime, editedDuration } from '../lib/edl.js';
import { FFMPEG, probe, run } from '../lib/ffmpeg.js';
import { formatTime } from '../lib/time.js';
import { isMain } from '../lib/cli.js';

async function still(video, t, file) {
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-q:v', '3', file]);
}

export async function check(outDir, { log = console.log } = {}) {
  const source = readJson(path.join(outDir, 'source.json'));
  const edl = normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')));
  const render = readJson(path.join(outDir, 'render.json'), { cues: [] });
  const video = path.join(outDir, 'edited.mp4');
  const dir = path.join(outDir, 'check');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const issues = [];
  const edited = await probe(video);
  const expected = editedDuration(edl.cuts, source.duration);
  if (Math.abs(edited.duration - expected) > 0.25) {
    issues.push({ id: 'video', rule: 'duration', message: `Edited video is ${edited.duration.toFixed(2)}s; the cuts imply ${expected.toFixed(2)}s.` });
  }
  if (edited.width !== source.width || edited.height !== source.height) {
    issues.push({ id: 'video', rule: 'resolution', message: `Resolution changed from ${source.width}x${source.height}.` });
  }
  if (source.hasAudio && !edited.hasAudio) {
    issues.push({ id: 'video', rule: 'audio', message: 'The audio track was lost.' });
  }
  for (const r of render.cues) {
    for (const message of r.layoutIssues || []) issues.push({ id: r.id, rule: 'layout', message });
  }

  const frames = [];
  // A few frames of the whole video, so there is always something to look at, even when
  // there are no edits.
  for (const [name, frac] of [['overview-start', 0.1], ['overview-middle', 0.5], ['overview-end', 0.9]]) {
    const t = edited.duration * frac;
    const file = path.join(dir, `${name}.jpg`);
    await still(video, t, file);
    frames.push({ id: name, t: formatTime(t), file: path.relative(outDir, file), look_for: 'the video looks like the source: no artefacts, correct framing' });
  }
  for (const cue of edl.cues) {
    // Late in the cue, when everything has been revealed.
    const t = mapTime(cue.start + Math.max((cue.end - cue.start) * 0.75, (cue.end - cue.start) - 1), edl.cuts);
    const file = path.join(dir, `${cue.id}.jpg`);
    await still(video, t, file);
    frames.push({ id: cue.id, t: formatTime(t), file: path.relative(outDir, file), look_for: 'legible, anchored to the right thing, covers nothing important, spelled correctly' });
  }
  for (const cut of edl.cuts) {
    const t = mapTime(cut.start, edl.cuts);
    for (const [side, at] of [['before', t - 0.3], ['after', t + 0.3]]) {
      const file = path.join(dir, `${cut.id}-${side}.jpg`);
      await still(video, Math.max(0, Math.min(at, edited.duration - 0.05)), file);
      frames.push({ id: cut.id, t: formatTime(at), file: path.relative(outDir, file), look_for: 'the cut joins cleanly; no sentence or on-screen step is lost' });
    }
  }

  const result = { ok: issues.length === 0, expected_duration: expected, actual_duration: edited.duration, issues, frames };
  writeJson(path.join(outDir, 'check.json'), result);
  log(`  checked ${frames.length} frames, ${issues.length} issue(s)`);
  return result;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Usage: node scripts/check.mjs out/<video>');
    process.exit(2);
  }
  check(outDir)
    .then((r) => {
      for (const i of r.issues) console.log(`  ✗ ${i.id} [${i.rule}] ${i.message}`);
      process.exit(r.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
