#!/usr/bin/env node
// Checks everything the pipeline needs and says exactly what is missing and how to fix it.
//
// Usage: npm run doctor
import fs from 'node:fs';
import path from 'node:path';
import { run } from '../lib/ffmpeg.js';
import { ROOT } from '../lib/paths.js';
import { PROVIDERS, loadEnv, pickProvider } from './transcribe.mjs';

const checks = [];
const ok = (name, detail) => checks.push({ ok: true, name, detail });
const bad = (name, detail, fix) => checks.push({ ok: false, name, detail, fix });

// Node
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 0)) ok('Node', process.version);
else bad('Node', process.version, 'Install Node 22 or newer (nodejs.org, or `nvm install 22`).');

// Dependencies
if (fs.existsSync(path.join(ROOT, 'node_modules', 'animejs'))) ok('npm packages', 'installed');
else bad('npm packages', 'node_modules missing', 'Run `npm install` in the repo folder.');

// ffmpeg / ffprobe
for (const tool of ['ffmpeg', 'ffprobe']) {
  try {
    const { stdout } = await run(tool, ['-version']);
    ok(tool, stdout.split('\n')[0].split(' ').slice(0, 3).join(' '));
  } catch {
    bad(tool, 'not found on PATH', 'Install ffmpeg: `brew install ffmpeg` (macOS), `apt install ffmpeg` (Debian/Ubuntu), or ffmpeg.org for Windows.');
  }
}

// Chromium for rendering overlays
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  await browser.close();
  ok('Chromium (Playwright)', 'launches');
} catch (e) {
  bad('Chromium (Playwright)', e.message.split('\n')[0], 'Run `npx playwright install chromium`.');
}

// Transcription key
loadEnv();
try {
  const name = pickProvider();
  ok('transcription', `${name} (${PROVIDERS[name].key} is set, model ${process.env.TRANSCRIBE_MODEL || PROVIDERS[name].model})`);
} catch (e) {
  const anyKey = Object.values(PROVIDERS).some((p) => process.env[p.key]);
  const noEnv = !fs.existsSync(path.join(ROOT, '.env'));
  if (!anyKey && noEnv) bad('transcription', 'no .env file', 'Run `cp .env.example .env` and set one key (AI_GATEWAY_API_KEY is the simplest). Or skip transcription with `--from captions.srt`.');
  else bad('transcription', e.message.split('\n')[0], 'Fix .env as described, or import captions with --from.');
}

// Videos
const videos = fs.existsSync(path.join(ROOT, 'videos')) ? fs.readdirSync(path.join(ROOT, 'videos')).filter((f) => /\.(mp4|mov|m4v)$/i.test(f)) : [];
if (videos.length) ok('videos/', videos.join(', '));
else bad('videos/', 'no recordings yet', 'Copy an MP4 into videos/.');

for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`);
  if (!c.ok) console.log(`    → ${c.fix}`);
}
const failed = checks.filter((c) => !c.ok);
console.log(failed.length ? `\n${failed.length} thing(s) to fix.` : '\nAll good. Try: node scripts/ingest.mjs');
process.exit(failed.length ? 1 : 0);
