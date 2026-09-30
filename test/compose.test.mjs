import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommand } from '../scripts/compose.mjs';
import { zoomExpressions } from '../lib/zoom.js';
import { normalizeEdl } from '../lib/edl.js';
import { designSpace } from '../lib/design.js';
import { rules } from './helpers.mjs';

const source = { path: '/v/in.mp4', width: 1280, height: 720, fps: 30, duration: 60, hasAudio: true };
const filter = (args) => args[args.indexOf('-filter_complex') + 1];

test('with no cuts the audio is copied untouched', () => {
  const args = buildCommand({ source, edl: normalizeEdl({}), rules, outDir: '/o', output: '/o/e.mp4' });
  assert.ok(args.join(' ').includes('-map 0:a -c:a copy'));
  assert.ok(!filter(args).includes('select'));
});

test('cuts remove the same ranges from video and audio', () => {
  const edl = normalizeEdl({ cuts: [{ id: 'c', from: 10, to: 12 }] });
  const g = filter(buildCommand({ source, edl, rules, outDir: '/o', output: '/o/e.mp4' }));
  assert.match(g, /select='not\(between\(t,10\.0000,12\.0000\)\)'/);
  assert.match(g, /aselect='not\(between\(t,10\.0000,12\.0000\)\)'/);
});

test('overlays are placed at their source time, before cuts are applied', () => {
  const edl = normalizeEdl({
    cuts: [{ id: 'c', from: 1, to: 2 }],
    cues: [{ id: 'cue-1', at: 20, duration: 4, template: 'callout', params: { text: 'x' } }],
  });
  const args = buildCommand({ source, edl, rules, outDir: '/o', output: '/o/e.mp4' });
  assert.ok(args.includes('/o/overlays/cue-1.mov'));
  const g = filter(args);
  assert.match(g, /setpts=PTS-STARTPTS\+20\.0000\/TB/);
  assert.ok(g.indexOf('overlay=') < g.indexOf('select='));
});

test('zoom eases in and out around the region centre', () => {
  const design = designSpace(1280, 720);
  const [cue] = normalizeEdl({ cues: [{ id: 'z', at: 5, duration: 3, template: 'zoom', params: { region: { x: 480, y: 270, w: 960, h: 540 } } }] }).cues;
  const z = zoomExpressions([cue], design, rules);
  // Region centre (960, 540) design px → (640, 360) source px.
  assert.match(z.x, /clip\(640-iw\/zoom\/2/);
  assert.match(z.y, /clip\(360-ih\/zoom\/2/);
  assert.match(z.z, /^1\+/);
  assert.match(z.x, /between\(it,5,8\)/);
  assert.equal(zoomExpressions([], design, rules), null);
});
