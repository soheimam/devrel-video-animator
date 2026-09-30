#!/usr/bin/env node
// Stage 1: prepares out/<video>/ for the agents: source.json (probe), transcript, frames.
//
// Usage: node scripts/ingest.mjs inbox/<video>.mp4 [--out out/<name>] [--model small]
//        [--transcript existing.json] [--every 10] [--no-ocr]
import fs from 'node:fs';
import path from 'node:path';
import { probe } from '../lib/ffmpeg.js';
import { writeJson } from '../lib/files.js';
import { ROOT, slugFor } from '../lib/paths.js';
import { transcribe } from './transcribe.mjs';
import { captureFrames } from './frames.mjs';
import { isMain, parseArgs } from '../lib/cli.js';

export async function ingest(video, { out, model, transcript, every, ocr = true, log = console.log } = {}) {
  const outDir = out || path.join(ROOT, 'out', slugFor(video));
  fs.mkdirSync(outDir, { recursive: true });
  log(`ingest → ${outDir}`);
  const source = await probe(path.resolve(video));
  writeJson(path.join(outDir, 'source.json'), source);
  log(`  source: ${source.width}x${source.height} @ ${source.fps}fps, ${source.duration.toFixed(1)}s, audio: ${source.hasAudio ? 'yes' : 'no'}`);
  await transcribe(source.path, outDir, { model, from: transcript, log });
  await captureFrames(outDir, { every, ocr, log });
  return outDir;
}

if (isMain(import.meta.url)) {
  const { positional: [video], flags } = parseArgs(process.argv.slice(2));
  if (!video) {
    console.error('Usage: node scripts/ingest.mjs inbox/<video>.mp4 [--out out/<name>] [--model small] [--transcript file.json]');
    process.exit(2);
  }
  ingest(video, {
    out: flags.out,
    model: flags.model,
    transcript: flags.transcript,
    every: flags.every ? Number(flags.every) : undefined,
    ocr: !flags['no-ocr'],
  }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
