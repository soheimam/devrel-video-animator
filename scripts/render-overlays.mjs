#!/usr/bin/env node
// Renders every overlay cue in edits.yaml to a transparent video clip (overlays/<id>.mov),
// frame by frame, by seeking the cue's anime.js timeline in headless Chromium.
// Only the seconds around each cue are rendered, never the whole video.
//
// Usage: node scripts/render-overlays.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readJson, readYaml, writeJson } from '../lib/files.js';
import { normalizeEdl, overlayCues } from '../lib/edl.js';
import { designSpace } from '../lib/design.js';
import { loadRules } from '../lib/rules.js';
import { FFMPEG } from '../lib/ffmpeg.js';
import { startServer, launchBrowser, openStage } from '../lib/stage.js';
import { isMain } from '../lib/cli.js';

function encoder(file, fps) {
  const child = spawn(FFMPEG, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'png', '-pix_fmt', 'rgba',
    file,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d));
  const done = new Promise((resolve, reject) => {
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${stderr}`))));
  });
  return { stdin: child.stdin, done };
}

const write = (stream, buf) =>
  new Promise((resolve) => (stream.write(buf) ? resolve() : stream.once('drain', resolve)));

export async function renderOverlays(outDir, { log = console.log } = {}) {
  const source = readJson(path.join(outDir, 'source.json'));
  const edl = normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')), loadRules().timing.lead_seconds);
  const rules = loadRules();
  const design = designSpace(source.width, source.height);
  const cues = overlayCues(edl);
  const dir = path.join(outDir, 'overlays');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const results = [];
  if (cues.length) {
    const { server, url } = await startServer();
    const browser = await launchBrowser();
    try {
      const { page, errors } = await openStage(browser, url, design, design.scale);
      for (const cue of cues) {
        const duration = cue.end - cue.start;
        await page.evaluate((spec) => window.stage.load(spec), {
          template: cue.template,
          params: cue.params,
          anchor: cue.anchor,
          duration,
          cueStart: cue.start,
          lead: rules.timing.lead_seconds,
          design,
          layout: rules.layout,
        });
        const layoutIssues = await page.evaluate(() => {
          window.stage.seek(window.stage.ctx.durationMs - 300);
          return window.stage.layoutIssues();
        });
        const file = path.join(dir, `${cue.id}.mov`);
        const enc = encoder(file, source.fps);
        const frames = Math.ceil(duration * source.fps);
        for (let i = 0; i < frames; i++) {
          await page.evaluate((ms) => window.stage.seek(ms), (i * 1000) / source.fps);
          await write(enc.stdin, await page.screenshot({ omitBackground: true, type: 'png' }));
        }
        enc.stdin.end();
        await enc.done;
        if (errors.length) throw new Error(`Template ${cue.template} (${cue.id}) errored: ${errors.join('; ')}`);
        results.push({ id: cue.id, template: cue.template, file: path.relative(outDir, file), frames, layoutIssues });
        log(`  rendered ${cue.id} (${cue.template}, ${frames} frames)`);
      }
    } finally {
      await browser.close();
      server.close();
    }
  }
  writeJson(path.join(outDir, 'render.json'), { design, cues: results });
  return results;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Usage: node scripts/render-overlays.mjs out/<video>');
    process.exit(2);
  }
  renderOverlays(outDir).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
