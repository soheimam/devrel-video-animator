#!/usr/bin/env node
// Builds a synthetic "screen recording" (a code editor made of coloured bars, with a tone
// for narration) and runs the full build on examples/demo/edits.yaml. It exists to show
// the pipeline end to end without a real recording or Whisper.
//
// Usage: node scripts/demo.mjs [out/demo]
import fs from 'node:fs';
import path from 'node:path';
import { FFMPEG, run, probe } from '../lib/ffmpeg.js';
import { writeJson } from '../lib/files.js';
import { ROOT } from '../lib/paths.js';
import { build } from './build.mjs';
import { isMain } from '../lib/cli.js';

const W = 1280;
const H = 720;
export const DEMO_DURATION = 23;

// Lines of "code": [indent, width, colour]. Line 6 is the TTL setting.
const LINES = [
  [0, 260, '0xc792ea'], [1, 420, '0x82aaff'], [2, 360, '0xc3e88d'], [2, 300, '0xc3e88d'],
  [1, 180, '0x82aaff'], [0, 120, '0x89ddff'], [1, 520, '0xffcb6b'], [1, 340, '0x82aaff'],
  [2, 460, '0xc3e88d'], [2, 280, '0xf78c6c'], [1, 140, '0x82aaff'], [0, 90, '0x89ddff'],
];

export async function makeDemoVideo(file) {
  const boxes = LINES.map(([indent, w, c], i) =>
    `drawbox=x=${80 + indent * 40}:y=${60 + i * 26}:w=${w}:h=12:color=${c}@0.9:t=fill`);
  // Line numbers gutter and a status bar, so it reads as an editor.
  boxes.push('drawbox=x=0:y=0:w=48:h=720:color=0x15171c:t=fill');
  boxes.push(`drawbox=x=0:y=${H - 28}:w=${W}:h=28:color=0x2b2f38:t=fill`);
  const silent = 'between(t,4.5,7.5)+between(t,13.5,14.5)+gte(t,20.5)';
  await run(FFMPEG, [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=0x1e2127:s=${W}x${H}:r=30:d=${DEMO_DURATION}`,
    '-f', 'lavfi', '-i', `sine=frequency=330:sample_rate=48000:duration=${DEMO_DURATION}`,
    '-vf', boxes.join(','),
    '-af', `volume='if(${silent},0,0.2)':eval=frame`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest',
    file,
  ]);
  return file;
}

export async function prepareDemo(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const video = await makeDemoVideo(path.join(outDir, 'demo.mp4'));
  writeJson(path.join(outDir, 'source.json'), await probe(path.resolve(video)));
  for (const f of ['transcript.json', 'edits.yaml']) {
    fs.copyFileSync(path.join(ROOT, 'examples', 'demo', f), path.join(outDir, f));
  }
  return outDir;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2] || path.join(ROOT, 'out', 'demo');
  prepareDemo(outDir)
    .then(() => build(outDir))
    .then(() => console.log(`\nDone. Watch ${path.join(outDir, 'edited.mp4')} and read ${path.join(outDir, 'report.md')}`))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
