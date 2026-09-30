import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeDemoVideo } from '../scripts/demo.mjs';
import { ingest } from '../scripts/ingest.mjs';
import { captureFrames } from '../scripts/frames.mjs';
import { ROOT } from '../lib/paths.js';
import { hasFfmpeg, tmpDir } from './helpers.mjs';

test('ingest probes, imports a transcript and captures grid frames', { skip: !hasFfmpeg && 'needs ffmpeg', timeout: 120000 }, async () => {
  const dir = tmpDir('dva-ingest-');
  const video = await makeDemoVideo(path.join(dir, 'talk.mp4'));
  const out = path.join(dir, 'out');
  await ingest(video, { out, transcript: path.join(ROOT, 'examples/demo/transcript.json'), every: 10, log: () => {} });

  const source = JSON.parse(fs.readFileSync(path.join(out, 'source.json'), 'utf8'));
  assert.deepEqual([source.width, source.height, source.fps, source.hasAudio], [1280, 720, 30, true]);
  assert.match(fs.readFileSync(path.join(out, 'transcript.md'), 'utf8'), /TTL to 300 seconds/);

  let index = JSON.parse(fs.readFileSync(path.join(out, 'frames/index.json'), 'utf8'));
  assert.deepEqual(index.map((f) => f.t), [0, 10, 20]);
  for (const f of index) {
    assert.ok(fs.existsSync(path.join(out, f.file)));
    assert.ok(fs.existsSync(path.join(out, f.grid)));
  }

  // Agents can ask for frames at exact moments; repeats are ignored.
  await captureFrames(out, { at: [8.9, 8.9], log: () => {} });
  index = JSON.parse(fs.readFileSync(path.join(out, 'frames/index.json'), 'utf8'));
  assert.deepEqual(index.map((f) => [f.t, f.reason]), [[0, 'sample'], [8.9, 'requested'], [10, 'sample'], [20, 'sample']]);
});
