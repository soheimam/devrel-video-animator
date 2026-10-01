#!/usr/bin/env node
// Renders edits.yaml into the finished video:
// validate → render overlays → compose (with captions) → GIF previews → report.
//
// Usage: node scripts/render.mjs out/<video>
import path from 'node:path';
import fs from 'node:fs';
import { validateDir, printIssues } from './validate.mjs';
import { renderOverlays } from './render-overlays.mjs';
import { compose } from './compose.mjs';
import { writeReport } from './report.mjs';
import { makePreviews } from './previews.mjs';
import { isMain } from '../lib/cli.js';

export async function render(outDir, { log = console.log } = {}) {
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
  log('previews');
  await makePreviews(outDir, { log });
  log('report');
  writeReport(outDir, { log });
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir || !fs.existsSync(path.join(outDir, 'edits.yaml'))) {
    console.error('Usage: node scripts/render.mjs out/<video>   (needs out/<video>/edits.yaml)');
    process.exit(2);
  }
  build(outDir).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
