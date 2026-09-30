#!/usr/bin/env node
// Runs the mechanical half of the pipeline once edits.yaml has been through the critic:
// validate → render overlays → compose → check → report.
//
// Usage: node scripts/build.mjs out/<video>
import path from 'node:path';
import fs from 'node:fs';
import { validateDir, printIssues } from './validate.mjs';
import { renderOverlays } from './render-overlays.mjs';
import { compose } from './compose.mjs';
import { check } from './check.mjs';
import { writeReport } from './report.mjs';
import { isMain } from '../lib/cli.js';

export async function build(outDir, { log = console.log } = {}) {
  log('validate');
  const validation = validateDir(outDir);
  printIssues(validation, log);
  if (validation.errors.length) {
    writeReport(outDir, { log });
    throw new Error('edits.yaml has errors; fix them (or reject those edits) before rendering.');
  }
  log('render overlays');
  await renderOverlays(outDir, { log });
  log('compose');
  await compose(outDir, { log });
  log('check');
  const result = await check(outDir, { log });
  for (const i of result.issues) log(`  ✗ ${i.id} [${i.rule}] ${i.message}`);
  log('report');
  writeReport(outDir, { log });
  return result;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir || !fs.existsSync(path.join(outDir, 'edits.yaml'))) {
    console.error('Usage: node scripts/build.mjs out/<video>   (needs out/<video>/edits.yaml)');
    process.exit(2);
  }
  build(outDir).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
