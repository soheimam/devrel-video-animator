#!/usr/bin/env node
// Stage 1: prepares out/<video>/ for the agents: source.json (probe), transcript, frames.
//
// Usage: node scripts/ingest.mjs videos/<video>.mp4 [--out out/<name>] [--from captions.srt]
//        [--language en] [--every 10]
import fs from 'node:fs';
import path from 'node:path';
import { probe, hasCommand, FFMPEG, FFPROBE } from '../lib/ffmpeg.js';
import { writeJson } from '../lib/files.js';
import { ROOT, slugFor } from '../lib/paths.js';
import { transcribe } from './transcribe.mjs';
import { captureFrames } from './frames.mjs';
import { isMain, parseArgs } from '../lib/cli.js';

export async function preflight(video) {
  const problems = [];
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) problems.push(`Node ${process.version} is too old; install Node 22 or newer.`);
  if (!fs.existsSync(path.join(ROOT, 'node_modules', 'yaml'))) problems.push('Dependencies are not installed; run `npm install` in the repo folder.');
  if (!fs.existsSync(video)) problems.push(`Video not found: ${video} (paths are relative to where you run the command; try videos/<file>.mp4 from the repo root).`);
  for (const tool of [FFMPEG, FFPROBE]) if (!(await hasCommand(tool))) problems.push(`${tool} is not installed or not on PATH (brew install ffmpeg / apt install ffmpeg).`);
  if (problems.length) throw new Error(`Can't start:\n  - ${problems.join('\n  - ')}\nRun \`npm run doctor\` for a full check.`);
}

export async function ingest(video, { out, from, language, every, log = console.log } = {}) {
  await preflight(video);
  const outDir = out || path.join(ROOT, 'out', slugFor(video));
  fs.mkdirSync(outDir, { recursive: true });
  log(`ingest → ${outDir}`);
  const source = await probe(path.resolve(video));
  writeJson(path.join(outDir, 'source.json'), source);
  log(`  source: ${source.width}x${source.height} @ ${source.fps}fps, ${source.duration.toFixed(1)}s, audio: ${source.hasAudio ? 'yes' : 'no'}`);
  await transcribe(source.path, outDir, { from, language, log });
  await captureFrames(outDir, { every, log });
  return outDir;
}

// With no argument, use the one recording in videos/ (npm sometimes swallows arguments).
export function defaultVideo() {
  const dir = path.join(ROOT, 'videos');
  const found = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(mp4|mov|m4v)$/i.test(f)) : [];
  if (found.length === 1) return path.join(dir, found[0]);
  if (found.length === 0) throw new Error('No recording given and videos/ is empty. Copy an MP4 into videos/ or pass a path:\n  node scripts/ingest.mjs videos/<file>.mp4');
  throw new Error(`Which recording? videos/ has: ${found.join(', ')}\n  node scripts/ingest.mjs videos/<file>.mp4`);
}

if (isMain(import.meta.url)) {
  const { positional: [given], flags } = parseArgs(process.argv.slice(2));
  let video;
  try {
    video = given || defaultVideo();
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (!given) console.log(`No path given; using ${path.relative(process.cwd(), video)}`);
  ingest(video, {
    out: flags.out,
    from: flags.from,
    language: flags.language,
    every: flags.every ? Number(flags.every) : undefined,
  }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
