#!/usr/bin/env node
// Checks edits.yaml against the mechanical rules of the editorial standard and writes
// validation.json. Exit code 1 means there are errors to fix before rendering.
//
// Usage: node scripts/validate.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml, writeJson } from '../lib/files.js';
import { validateEdl, normalizeEdl } from '../lib/edl.js';
import { loudness } from '../lib/ffmpeg.js';
import { loadRules } from '../lib/rules.js';
import { fullText } from '../lib/transcript.js';
import { sourceVideo } from '../lib/paths.js';
import { isMain } from '../lib/cli.js';

// Transcript gaps are not pauses: transcribers drop sentences. Every cut is measured.
export async function checkCutsAudio(source, rawEdl, rules) {
  const errors = [];
  for (const cut of normalizeEdl(rawEdl).cuts) {
    if (Number.isNaN(cut.start) || Number.isNaN(cut.end) || cut.end <= cut.start) continue;
    const { mean, max } = await loudness(source.path, cut.start, cut.end);
    if (Number.isFinite(mean) && mean > rules.cuts.max_mean_db) {
      errors.push({ id: cut.id, rule: 'audio', message: `Cut contains sound (mean ${mean.toFixed(1)} dB, peak ${max.toFixed(1)} dB; silence is below ${rules.cuts.max_mean_db} dB). A gap in the transcript is not a pause; listen, or keep the footage.` });
    }
  }
  return errors;
}

export async function validateDir(outDir) {
  const source = readJson(path.join(outDir, 'source.json'));
  const transcript = readJson(path.join(outDir, 'transcript.json'), { segments: [] });
  const raw = readYaml(path.join(outDir, 'edits.yaml'));
  const rules = loadRules();
  const result = validateEdl(raw, { rules, video: source, transcriptText: fullText(transcript) });
  // The audio guard never skips silently: a missing recording is an error.
  source.path = sourceVideo(source);
  result.errors.push(...(await checkCutsAudio(source, raw, rules)));
  writeJson(path.join(outDir, 'validation.json'), result);
  return result;
}

export function printIssues({ errors, warnings }, log = console.log) {
  for (const e of errors) log(`  ✗ ${e.id} [${e.rule}] ${e.message}`);
  for (const w of warnings) log(`  ! ${w.id} [${w.rule}] ${w.message}`);
  if (!errors.length && !warnings.length) log('  ✓ edits.yaml passes every mechanical rule');
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir || !fs.existsSync(path.join(outDir, 'edits.yaml'))) {
    console.error('Usage: node scripts/validate.mjs out/<video>   (needs out/<video>/edits.yaml)');
    process.exit(2);
  }
  const result = await validateDir(outDir);
  printIssues(result);
  process.exit(result.errors.length ? 1 : 0);
}
