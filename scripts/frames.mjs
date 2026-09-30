#!/usr/bin/env node
// Captures still frames so agents can see what is on screen: at every scene change, at a
// regular interval (screen recordings often have no scene changes), and at any times
// requested with --at. Each frame also gets a copy with a coordinate grid, and OCR text
// when tesseract is installed. Writes frames/index.json and frames/ocr.json.
//
// Grid lines are every 240 design pixels (design space: short side = 1080, origin top-left),
// so a landscape frame is 8 × 4.5 cells of 240px.
//
// Usage: node scripts/frames.mjs out/<video> [--every 10] [--scene 0.3] [--at 12.5,01:40]
import fs from 'node:fs';
import path from 'node:path';
import { FFMPEG, run } from '../lib/ffmpeg.js';
import { readJson, writeJson } from '../lib/files.js';
import { designSpace } from '../lib/design.js';
import { parseTime, formatTime } from '../lib/time.js';
import { isMain, parseArgs } from '../lib/cli.js';

export const GRID_DESIGN_PX = 240;

export async function sceneChanges(video, threshold) {
  const { stderr } = await run(FFMPEG, [
    '-hide_banner', '-i', video,
    '-vf', `select='gt(scene,${threshold})',showinfo`,
    '-f', 'null', '-',
  ]);
  return [...stderr.matchAll(/pts_time:(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
}

async function hasTesseract() {
  return run('tesseract', ['--version']).then(() => true, () => false);
}

export async function captureFrames(outDir, { every = 10, scene = 0.3, at = [], ocr = true, log = console.log } = {}) {
  const source = readJson(path.join(outDir, 'source.json'));
  const dir = path.join(outDir, 'frames');
  fs.mkdirSync(dir, { recursive: true });
  const indexFile = path.join(dir, 'index.json');
  const index = readJson(indexFile, []);
  const have = new Set(index.map((f) => f.t.toFixed(1)));

  const wanted = [];
  if (!index.length) {
    for (let t = 0; t < source.duration; t += every) wanted.push({ t, reason: 'sample' });
    for (const t of await sceneChanges(source.path, scene)) wanted.push({ t, reason: 'scene-change' });
  }
  for (const t of at) wanted.push({ t, reason: 'requested' });
  wanted.sort((a, b) => a.t - b.t);

  const { scale } = designSpace(source.width, source.height);
  const cell = Math.round(GRID_DESIGN_PX * scale);
  const doOcr = ocr && (await hasTesseract());
  const ocrFile = path.join(dir, 'ocr.json');
  const ocrOut = readJson(ocrFile, []);

  let added = 0;
  for (const { t, reason } of wanted) {
    const key = t.toFixed(1);
    // Skip near-duplicates of frames already captured (unless explicitly requested).
    if (have.has(key) || (reason !== 'requested' && index.some((f) => Math.abs(f.t - t) < 1))) continue;
    have.add(key);
    const name = `f-${key.replace('.', '_')}`;
    const file = path.join(dir, `${name}.jpg`);
    const grid = path.join(dir, `${name}.grid.jpg`);
    const seek = Math.min(t, Math.max(0, source.duration - 0.05)).toFixed(3);
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', seek, '-i', source.path, '-frames:v', '1', '-q:v', '3', file]);
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', file, '-vf', `drawgrid=w=${cell}:h=${cell}:t=2:c=white@0.45`, grid]);
    const entry = { t, time: formatTime(t), reason, file: path.relative(outDir, file), grid: path.relative(outDir, grid) };
    if (doOcr) {
      const { stdout } = await run('tesseract', [file, 'stdout', '--psm', '3']).catch(() => ({ stdout: '' }));
      const text = stdout.replace(/\s+/g, ' ').trim();
      if (text) ocrOut.push({ t, time: entry.time, text });
    }
    index.push(entry);
    added++;
  }
  index.sort((a, b) => a.t - b.t);
  ocrOut.sort((a, b) => a.t - b.t);
  writeJson(indexFile, index);
  writeJson(ocrFile, ocrOut);
  log(`  frames: ${added} new (${index.length} total)${doOcr ? ', OCR on' : ', OCR off (tesseract not installed)'}`);
  return index;
}

if (isMain(import.meta.url)) {
  const { positional: [outDir], flags } = parseArgs(process.argv.slice(2));
  if (!outDir) {
    console.error('Usage: node scripts/frames.mjs out/<video> [--every 10] [--scene 0.3] [--at 12.5,01:40]');
    process.exit(2);
  }
  const at = flags.at ? String(flags.at).split(',').map(parseTime) : [];
  captureFrames(outDir, {
    every: flags.every ? Number(flags.every) : undefined,
    scene: flags.scene ? Number(flags.scene) : undefined,
    at,
  }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
