#!/usr/bin/env node
// Puts a render where a reviewer can get it from the PR: binaries go to a rolling GitHub
// Release (edited video, captions, GIFs, strips), and one comment on the PR carries the
// pacing line, every beat with its GIF and strip, the cuts, and the download links. The
// comment is updated in place on every round, so the PR has one live review, not a stack.
//
// Usage: node scripts/publish.mjs out/<video> --pr <number> [--tag renders] [--dry-run]
// Needs `gh` authenticated and GITHUB_REPOSITORY set (GitHub Actions provides both).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readJson, readYaml, writeJson } from '../lib/files.js';
import { normalizeEdl, mapTime, pacing } from '../lib/edl.js';
import { loadRules } from '../lib/rules.js';
import { formatTime } from '../lib/time.js';
import { isMain, parseArgs } from '../lib/cli.js';
import { describe } from './report.mjs';

export const MARKER = (name) => `<!-- animate-video:${name} -->`;

// Release assets share one namespace, so every file is prefixed with the video's name.
export const assetName = (name, file) => `${name}--${path.basename(file)}`;
export const assetUrl = (repo, tag, name, file) => `https://github.com/${repo}/releases/download/${tag}/${assetName(name, file)}`;

export function collectAssets(outDir) {
  const files = ['edited.mp4', 'captions.srt', 'captions.vtt']
    .map((f) => path.join(outDir, f))
    .filter((f) => fs.existsSync(f));
  const previewDir = path.join(outDir, 'preview');
  if (fs.existsSync(previewDir)) {
    for (const f of fs.readdirSync(previewDir).sort()) {
      if (/\.(gif|jpg)$/.test(f)) files.push(path.join(previewDir, f));
    }
  }
  return files;
}

export function buildComment({ name, repo, tag, edl, source, prNumber, round }) {
  const url = (file) => assetUrl(repo, tag, name, file);
  const p = pacing(edl, source.duration);
  const L = [MARKER(name), `## ${name}: ${edl.cues.length} animations, ${edl.cuts.length} cut(s), captions`, ''];
  L.push(`**[Download edited.mp4](${url('edited.mp4')})** · [captions.srt](${url('captions.srt')}) · [captions.vtt](${url('captions.vtt')})${round ? ` · round ${round}` : ''}`, '');
  L.push(`${formatTime(source.duration)} source · ${p.perMinute.toFixed(1)} animations per minute · something on screen ${Math.round(p.coveredShare * 100)}% of the time · longest stretch with nothing: ${p.longestGap.seconds.toFixed(0)}s at ${formatTime(p.longestGap.start)}`, '');
  L.push('### Beats', '', 'Each one: the GIF, then three moments (just landed · last reveal · one second before it leaves).', '');
  for (const c of [...edl.cues].sort((a, b) => a.start - b.start)) {
    L.push(`- [ ] **${c.id} · ${c.template}** · ${formatTime(c.start)} · ${describe(c)}`);
    L.push(`  ${c.rationale || ''}`);
    L.push('');
    L.push(`  ![${c.id}](${url(`preview/${c.id}.gif`)})`);
    L.push(`  ![${c.id} moments](${url(`preview/${c.id}.strip.jpg`)})`, '');
  }
  if (edl.cuts.length) {
    L.push('### Cuts', '');
    for (const c of [...edl.cuts].sort((a, b) => a.start - b.start)) L.push(`- [ ] **${c.id}** · ${formatTime(c.start)}–${formatTime(c.end)} (${(c.end - c.start).toFixed(1)}s) · ${c.reason || ''}`);
    L.push('');
  }
  if (edl.rejected.length) {
    L.push('<details><summary>Considered and left out</summary>', '');
    for (const r of edl.rejected) L.push(`- **${r.summary}** · ${r.rule}`);
    L.push('', '</details>', '');
  }
  L.push('### Give notes', '', 'Reply on this PR, mentioning `@claude`, in plain words:', '',
    '> @claude drop beat-3, beat-6 a second later, beat-9 should say "Create a token", restore cut-1', '',
    'The video is re-rendered and this comment updates in place. When you are happy, download the MP4 above and publish; merge the PR to keep the edit list.', '',
    `_Edit list: \`out/${name}/edits.yaml\` on this branch. Report: \`out/${name}/report.md\`._`);
  return L.join('\n');
}

function gh(args, opts = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts });
}

function ensureRelease(tag) {
  try {
    gh(['release', 'view', tag], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    gh(['release', 'create', tag, '--title', 'Renders', '--notes', 'Edited videos and previews published by the animate workflow. Assets are replaced on every round.', '--latest=false']);
  }
}

function upsertComment(repo, prNumber, name, body) {
  const existing = JSON.parse(gh(['api', `repos/${repo}/issues/${prNumber}/comments?per_page=100`]));
  const mine = existing.find((c) => typeof c.body === 'string' && c.body.startsWith(MARKER(name)));
  const tmp = path.join(process.env.RUNNER_TEMP || '/tmp', `animate-comment-${name}.md`);
  fs.writeFileSync(tmp, body);
  if (mine) gh(['api', '--method', 'PATCH', `repos/${repo}/issues/comments/${mine.id}`, '-F', `body=@${tmp}`]);
  else gh(['api', '--method', 'POST', `repos/${repo}/issues/${prNumber}/comments`, '-F', `body=@${tmp}`]);
  return mine ? 'updated' : 'posted';
}

export async function publish(outDir, { pr, tag = 'renders', repo = process.env.GITHUB_REPOSITORY, dryRun = false, round, log = console.log } = {}) {
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set (or pass --repo owner/name).');
  const name = path.basename(outDir);
  const source = readJson(path.join(outDir, 'source.json'));
  const edl = normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')), loadRules().timing.lead_seconds);
  const files = collectAssets(outDir);
  const assets = Object.fromEntries(files.map((f) => [path.relative(outDir, f), assetUrl(repo, tag, name, f)]));
  writeJson(path.join(outDir, 'assets.json'), { release: tag, assets });
  const comment = buildComment({ name, repo, tag, edl, source, prNumber: pr, round });
  if (dryRun) {
    log(`would upload ${files.length} file(s) to release '${tag}' and ${pr ? 'post on PR #' + pr : 'post nothing'}`);
    return { files, comment };
  }
  ensureRelease(tag);
  // Upload under the prefixed name: gh takes "path#label" but not a rename, so stage copies.
  const stage = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'renders-'));
  const staged = files.map((f) => {
    const dest = path.join(stage, assetName(name, f));
    fs.copyFileSync(f, dest);
    return dest;
  });
  gh(['release', 'upload', tag, ...staged, '--clobber']);
  log(`  uploaded ${staged.length} file(s) to release '${tag}'`);
  if (pr) log(`  comment ${upsertComment(repo, pr, name, comment)} on PR #${pr}`);
  return { files, comment };
}

if (isMain(import.meta.url)) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const outDir = positional[0];
  if (!outDir) {
    console.error('Usage: node scripts/publish.mjs out/<video> --pr <number> [--tag renders] [--repo owner/name] [--round N] [--dry-run]');
    process.exit(2);
  }
  publish(outDir, { pr: flags.pr, tag: flags.tag, repo: flags.repo, round: flags.round, dryRun: Boolean(flags['dry-run']) })
    .then((r) => {
      if (flags['dry-run']) console.log(r.comment);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
