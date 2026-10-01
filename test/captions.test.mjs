import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrap, captionCues, toSRT, toVTT, toASS, captionMargins } from '../lib/captions.js';
import { normalizeEdl } from '../lib/edl.js';
import { rules } from './helpers.mjs';

const words = (text, start, step = 0.3) =>
  text.split(' ').map((w, i) => ({ word: w, start: start + i * step, end: start + i * step + step * 0.9 }));
const transcript = (...segs) => ({ segments: segs.map((ws) => ({ words: ws })) });

test('lines wrap at the most balanced point', () => {
  assert.deepEqual(wrap('short line', 42), ['short line']);
  assert.deepEqual(wrap('Here is the cache config for our edge worker.', 42), ['Here is the cache config', 'for our edge worker.']);
});

test('captions break on pauses, length and finished sentences', () => {
  const t = transcript(
    words('This line sets the TTL to 300 seconds.', 0),
    words('Then we deploy it', 5),
  );
  const cues = captionCues(t, [], rules.captions);
  assert.deepEqual(cues.map((c) => c.text), ['This line sets the TTL to 300 seconds.', 'Then we deploy it']);
  const long = captionCues(transcript(words(Array(40).fill('word').join(' '), 0, 0.1)), [], rules.captions);
  assert.ok(long.every((c) => c.lines.length <= 2 && c.lines.every((l) => l.length <= 42)));
});

test('captions follow the edit: words in cuts are dropped and later ones shift', () => {
  const t = transcript(words('keep this', 0), words('drop this bit', 3), words('and this stays', 8));
  const cuts = normalizeEdl({ cuts: [{ id: 'c', from: 2.5, to: 6 }] }).cuts;
  const cues = captionCues(t, cuts, rules.captions);
  assert.deepEqual(cues.map((c) => c.text), ['keep this', 'and this stays']);
  assert.ok(Math.abs(cues[1].start - (8 - 3.5)) < 1e-9);
});

test('short captions get time to be read without overlapping the next one', () => {
  const t = transcript([{ word: 'Hi.', start: 0, end: 0.2 }], [{ word: 'Next', start: 1.1, end: 1.5 }]);
  const [a, b] = captionCues(t, [], rules.captions);
  assert.ok(a.end <= b.start - 0.05 + 1e-9);
  assert.ok(a.end > 0.2);
});

test('SRT and WebVTT formats', () => {
  const cues = [{ start: 1.5, end: 3.25, lines: ['Hello', 'world'] }];
  assert.equal(toSRT(cues), '1\n00:00:01,500 --> 00:00:03,250\nHello\nworld\n');
  assert.equal(toVTT(cues), 'WEBVTT\n\n00:00:01.500 --> 00:00:03.250\nHello\nworld\n');
});

test('captions move clear of a webcam in the bottom corner', () => {
  const frame = { w: 1662, h: 1080 };
  assert.deepEqual(captionMargins(frame, rules), { left: 48, right: 48 });
  assert.deepEqual(captionMargins(frame, rules, { x: 1062, y: 722, w: 600, h: 358 }), { left: 48, right: 1662 - 1062 + 48 });
  assert.deepEqual(captionMargins(frame, rules, { x: 0, y: 800, w: 400, h: 280 }), { left: 448, right: 48 });
  assert.deepEqual(captionMargins(frame, rules, { x: 1200, y: 40, w: 400, h: 200 }), { left: 48, right: 48 }, 'boxes above the caption band are ignored');
});

test('ASS output is in source pixels with the right margins', () => {
  const ass = toASS([{ start: 0, end: 2, lines: ['Hi {there}'] }], { width: 1108, height: 720, rules, avoid: { x: 1062, y: 722, w: 600, h: 358 } });
  assert.match(ass, /PlayResX: 1108\nPlayResY: 720/);
  const style = ass.split('\n').find((l) => l.startsWith('Style: Caption'));
  const f = style.split(',');
  assert.equal(Number(f[2]), Math.round(rules.captions.font_px * 720 / 1080));
  assert.equal(Number(f[20]), Math.round((1662 - 1062 + 48) * 720 / 1080), 'right margin clears the webcam');
  assert.match(ass, /Dialogue: 0,0:00:00.00,0:00:02.00,Caption,,0,0,0,,Hi there/);
});
