#!/usr/bin/env node
// Makes an animated GIF of every visual edit (preview/<id>.gif), cut from the edited video
// with half a second either side, so a reviewer can see each animation inline in a PR or in
// report.md without downloading the video.
//
// Also a three-frame strip per cue (preview/<id>.strip.jpg): the cue just landed, its last
// reveal landed, and one second before it exits. Pacing problems live in those three moments,
// and they are the ones the agent must look at before handing over.
//
// Usage: node scripts/previews.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readYaml } from '../lib/files.js';
import { normalizeEdl, mapTime } from '../lib/edl.js';
import { FFMPEG, run, probe } from '../lib/ffmpeg.js';
import { isMain } from '../lib/cli.js';
import { loadRules } from '../lib/rules.js';
import { formatTime } from '../lib/time.js';

const ENTER_SECONDS = 0.55; // templates/motion.js ENTER
const FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';

// The three moments worth looking at, in source time.
export function stripMoments(cue, lead) {
  const reveals = [
    ...(cue.params.steps || []),
    ...(cue.params.nodes || []),
    ...(cue.params.columns || []),
    cue.params.right,
  ]
    .filter((r) => r && typeof r === 'object' && r.at !== undefined)
    .map((r) => (typeof r.at === 'number' ? r.at : parseTimecode(r.at)) - lead);
  const landed = Math.min(cue.start + ENTER_SECONDS + 0.4, cue.end);
  const lastReveal = reveals.length ? Math.min(Math.max(...reveals) + ENTER_SECONDS + 0.3, cue.end) : null;
  const beforeExit = Math.max(cue.end - 1.0, cue.start);
  return [
    { label: 'landed', t: landed },
    { label: lastReveal === null ? 'middle' : 'last reveal', t: lastReveal ?? (cue.start + cue.end) / 2 },
    { label: '1s before exit', t: beforeExit },
  ];
}

function parseTimecode(tc) {
  const parts = String(tc).split(':').map(Number);
  return parts.reduce((acc, v) => acc * 60 + v, 0);
}

async function makeStrip(video, cue, edl, file, { width = 554 } = {}) {
  const moments = stripMoments(cue, loadRules().timing.lead_seconds);
  const inputs = [];
  const filters = [];
  moments.forEach((m, i) => {
    inputs.push('-ss', mapTime(m.t, edl.cuts).toFixed(3), '-i', video);
    const text = `${m.label}  ${formatTime(m.t)}`.replace(/[:'\\]/g, '\\$&');
    filters.push(`[${i}:v]scale=${width}:-1,drawtext=fontfile=${FONT}:text='${text}':x=12:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6[v${i}]`);
  });
  filters.push(`[v0][v1][v2]hstack=inputs=3[o]`);
  await run(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[o]', '-frames:v', '1', '-q:v', '4', file]);
}

export async function makePreviews(outDir, { width = 720, fps = 12, log = console.log } = {}) {
  const edl = normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')), loadRules().timing.lead_seconds);
  const video = path.join(outDir, 'edited.mp4');
  const dir = path.join(outDir, 'preview');
  fs.rmSync(dir, { recursive: true, force: true });
  if (!edl.cues.length) return [];
  fs.mkdirSync(dir, { recursive: true });
  const { duration } = await probe(video);
  const made = [];
  for (const cue of [...edl.cues].sort((a, b) => a.start - b.start)) {
    const start = Math.max(0, mapTime(cue.start, edl.cuts) - 0.5);
    const end = Math.min(duration, mapTime(cue.end, edl.cuts) + 0.5);
    const file = path.join(dir, `${cue.id}.gif`);
    await run(FFMPEG, [
      '-y', '-loglevel', 'error', '-ss', start.toFixed(3), '-t', (end - start).toFixed(3), '-i', video,
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
      file,
    ]);
    const strip = path.join(dir, `${cue.id}.strip.jpg`);
    await makeStrip(video, cue, edl, strip);
    made.push({ id: cue.id, file: path.relative(outDir, file), strip: path.relative(outDir, strip) });
  }
  log(`  previews: ${made.length} GIF(s) and strip(s) in ${path.relative(process.cwd(), dir) || dir}`);
  return made;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Usage: node scripts/previews.mjs out/<video>');
    process.exit(2);
  }
  makePreviews(outDir).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
