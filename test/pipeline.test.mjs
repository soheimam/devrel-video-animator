// End to end on the synthetic demo: validate → render → compose → previews → report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prepareDemo, DEMO_DURATION } from '../scripts/demo.mjs';
import { render } from '../scripts/render.mjs';
import { probe } from '../lib/ffmpeg.js';
import { hasBrowser, hasFfmpeg, tmpDir, grayFrame, meanDiff } from './helpers.mjs';

const skip = !hasBrowser || !hasFfmpeg ? 'needs Playwright Chromium and ffmpeg' : false;

test('the demo builds into a correct edited video', { skip, timeout: 300000 }, async () => {
  const dir = await prepareDemo(tmpDir('dva-demo-'));
  await render(dir, { log: () => {} });

  const source = await probe(path.join(dir, 'demo.mp4'));
  const edited = await probe(path.join(dir, 'edited.mp4'));
  assert.ok(Math.abs(edited.duration - (DEMO_DURATION - 2)) < 0.15, `2s cut removed (got ${edited.duration})`);
  assert.equal(edited.width, source.width);
  assert.equal(edited.height, source.height);
  assert.ok(edited.hasAudio, 'audio kept');

  // Before any edit the picture matches the source (above the caption band)...
  const top = (buf) => buf.subarray(0, 160 * 72);
  const bottom = (buf) => buf.subarray(160 * 76);
  assert.ok(meanDiff(top(grayFrame(path.join(dir, 'demo.mp4'), 1)), top(grayFrame(path.join(dir, 'edited.mp4'), 1))) < 2);
  // ...and captions are burned in at the bottom while the presenter speaks.
  assert.ok(meanDiff(bottom(grayFrame(path.join(dir, 'demo.mp4'), 2)), bottom(grayFrame(path.join(dir, 'edited.mp4'), 2))) > 3, 'caption visible at 2s');
  assert.match(fs.readFileSync(path.join(dir, 'captions.srt'), 'utf8'), /This line sets the TTL to 300 seconds\./);

  // Zoom (cue-1, source 08.6–11.6 → edited 06.6–09.6): mid-zoom the frame is magnified.
  const zoomDiff = meanDiff(grayFrame(path.join(dir, 'demo.mp4'), 10), grayFrame(path.join(dir, 'edited.mp4'), 8));
  assert.ok(zoomDiff > 5, `zoom changes the frame (diff ${zoomDiff.toFixed(1)})`);

  // Flow diagram (cue-2, source 16.3–21.8 → edited 14.3–19.8): the overlay is in the top right.
  const src = grayFrame(path.join(dir, 'demo.mp4'), 20.5);
  const out = grayFrame(path.join(dir, 'edited.mp4'), 18.5);
  const region = (buf) => {
    const px = [];
    for (let y = 0; y < 30; y++) for (let x = 100; x < 160; x++) px.push(buf[y * 160 + x]);
    return px;
  };
  assert.ok(meanDiff(region(src), region(out)) > 5, 'flow diagram visible in the top right');

  // After the overlays and speech end, the edited video matches the source again (cut-shifted).
  assert.ok(meanDiff(grayFrame(path.join(dir, 'demo.mp4'), 22.5), grayFrame(path.join(dir, 'edited.mp4'), 20.5)) < 2);

  for (const id of ['cue-1', 'cue-2']) assert.ok(fs.statSync(path.join(dir, 'preview', `${id}.gif`)).size > 10000, `${id} preview GIF`);
  const report = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /!\[cue-2\]\(preview\/cue-2\.gif\)/);
  assert.match(report, /✓ \d+ captions burned into the video/);
});

test('build refuses to render an edit list with errors', { skip }, async () => {
  const dir = await prepareDemo(tmpDir('dva-bad-'));
  const edits = path.join(dir, 'edits.yaml');
  fs.writeFileSync(edits, fs.readFileSync(edits, 'utf8').replace('gap: said-not-shown', 'gap: looks-cool'));
  await assert.rejects(render(dir, { log: () => {} }), /edits\.yaml has errors/);
  assert.ok(!fs.existsSync(path.join(dir, 'edited.mp4')));
  assert.match(fs.readFileSync(path.join(dir, 'report.md'), 'utf8'), /✗ cue-2 \[gap-test\]/);
});

test('an edit list with no edits hands back the original file untouched', { skip, timeout: 120000 }, async () => {
  const dir = await prepareDemo(tmpDir('dva-none-'));
  fs.writeFileSync(path.join(dir, 'edits.yaml'), 'video: demo.mp4\nobjectives:\n  - Find the TTL\ncuts: []\ncues: []\ncaptions:\n  burn: false\n');
  await render(dir, { log: () => {} });
  assert.ok(fs.readFileSync(path.join(dir, 'edited.mp4')).equals(fs.readFileSync(path.join(dir, 'demo.mp4'))));
});
