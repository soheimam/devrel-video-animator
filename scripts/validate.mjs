#!/usr/bin/env node
// Checks edits.yaml against the mechanical rules of the editorial standard and writes
// validation.json. Exit code 1 means there are errors to fix before rendering.
//
// Usage: node scripts/validate.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml, writeJson } from '../lib/files.js';
import { validateEdl } from '../lib/edl.js';
import { loadRules } from '../lib/rules.js';
import { fullText } from '../lib/transcript.js';
import { isMain } from '../lib/cli.js';

export function validateDir(outDir) {
  const source = readJson(path.join(outDir, 'source.json'));
  const transcript = readJson(path.join(outDir, 'transcript.json'), { segments: [] });
  const result = validateEdl(readYaml(path.join(outDir, 'edits.yaml')), {
    rules: loadRules(),
    video: source,
    transcriptText: fullText(transcript),
  });
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
  const result = validateDir(outDir);
  printIssues(result);
  process.exit(result.errors.length ? 1 : 0);
}
