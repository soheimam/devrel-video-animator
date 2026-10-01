import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fromOpenAI, fromSubtitles, groupWords, toMarkdown, fullText } from '../lib/transcript.js';
import { importTranscript } from '../scripts/transcribe.mjs';
import { ROOT } from '../lib/paths.js';
import { tmpDir } from './helpers.mjs';

const demo = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/demo/transcript.json'), 'utf8'));

test('OpenAI verbose_json: words are attached to their segments', () => {
  const t = fromOpenAI({
    language: 'english',
    segments: [{ start: 0, end: 2.2, text: ' Set the TTL. ' }, { start: 2.5, end: 3.4, text: ' Then deploy.' }],
    words: [
      { word: 'Set', start: 0.0, end: 0.3 }, { word: 'the', start: 0.3, end: 0.5 }, { word: 'TTL', start: 0.5, end: 1.0 },
      { word: 'Then', start: 2.5, end: 2.8 }, { word: 'deploy', start: 2.8, end: 3.4 },
    ],
  });
  assert.deepEqual(t.segments.map((s) => s.text), ['Set the TTL.', 'Then deploy.']);
  assert.deepEqual(t.segments[1].words.map((w) => w.word), ['Then', 'deploy']);
});

test('OpenAI output without segments is grouped by pause and punctuation', () => {
  const t = fromOpenAI({ words: [{ word: 'Hi.', start: 0, end: 0.3 }, { word: 'Go', start: 2, end: 2.3 }] });
  assert.equal(t.segments.length, 2);
  assert.deepEqual(groupWords([]), []);
});

test('SRT and VTT captions import with words spread across each cue', () => {
  const srt = '1\n00:00:01,000 --> 00:00:03,000\nSet the TTL\n\n2\n00:00:04,500 --> 00:00:05,500\n<i>Then deploy</i>\n';
  const t = fromSubtitles(srt);
  assert.deepEqual(t.segments.map((s) => s.text), ['Set the TTL', 'Then deploy']);
  assert.deepEqual(t.segments[0].words.map((w) => [w.word, w.start]), [['Set', 1], ['the', 1 + 2 / 3], ['TTL', 1 + 4 / 3]]);
  const vtt = 'WEBVTT\n\n00:01.000 --> 00:02.000\nHello\n';
  assert.equal(fromSubtitles(vtt).segments[0].start, 1);
});

test('importTranscript detects the format from the file', () => {
  const dir = tmpDir('dva-import-');
  fs.writeFileSync(path.join(dir, 'c.srt'), '1\n00:00:00,000 --> 00:00:01,000\nHello\n');
  assert.equal(importTranscript(path.join(dir, 'c.srt')).segments[0].text, 'Hello');
  fs.writeFileSync(path.join(dir, 'api.json'), JSON.stringify({ words: [{ word: 'Hello', start: 0, end: 1 }] }));
  assert.equal(importTranscript(path.join(dir, 'api.json')).segments[0].text, 'Hello');
  fs.writeFileSync(path.join(dir, 'norm.json'), JSON.stringify(demo()));
  assert.deepEqual(importTranscript(path.join(dir, 'norm.json')), demo());
  fs.writeFileSync(path.join(dir, 'x.json'), '{"foo":1}');
  assert.throws(() => importTranscript(path.join(dir, 'x.json')), /Unrecognised/);
});

test('markdown transcript shows timestamps and long pauses', () => {
  const md = toMarkdown(demo());
  assert.match(md, /\*\*\[00:07\.5 → 00:13\.5\]\*\* This line sets the TTL/);
  assert.match(md, /_\(pause 3\.0s\)_/);
  assert.match(fullText(demo()), /300 seconds/);
});
