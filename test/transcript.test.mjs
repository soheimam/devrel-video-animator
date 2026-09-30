import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fromOpenAIWhisper, fromWhisperCpp, toMarkdown, fullText } from '../lib/transcript.js';
import { parseGlossary, whisperPrompt, findMisspellings, loadGlossary } from '../lib/glossary.js';
import { normalizeAny } from '../scripts/transcribe.mjs';
import { ROOT } from '../lib/paths.js';

test('normalises openai-whisper output with word timestamps', () => {
  const t = fromOpenAIWhisper({
    language: 'en',
    segments: [{ start: 0.5, end: 2.1, text: ' Hello edge. ', words: [{ word: ' Hello', start: 0.5, end: 1.0 }, { word: ' edge.', start: 1.1, end: 2.1 }] }],
  });
  assert.equal(t.language, 'en');
  assert.deepEqual(t.segments[0].words.map((w) => w.word), ['Hello', 'edge.']);
  assert.equal(t.segments[0].text, 'Hello edge.');
});

test('regroups whisper.cpp word-per-entry output into sentences', () => {
  const t = fromWhisperCpp({
    result: { language: 'en' },
    transcription: [
      { text: ' Deploy', offsets: { from: 0, to: 400 } },
      { text: ' it.', offsets: { from: 400, to: 800 } },
      { text: ' Then', offsets: { from: 3000, to: 3300 } },
      { text: ' test', offsets: { from: 3300, to: 3700 } },
    ],
  });
  assert.equal(t.segments.length, 2);
  assert.equal(t.segments[0].text, 'Deploy it.');
  assert.equal(t.segments[1].start, 3);
});

test('normalizeAny detects the format and accepts already-normalised files', () => {
  const demo = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/demo/transcript.json'), 'utf8'));
  assert.deepEqual(normalizeAny(demo), demo);
  assert.throws(() => normalizeAny({ foo: 1 }), /Unrecognised/);
});

test('markdown transcript shows timestamps and long pauses', () => {
  const demo = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/demo/transcript.json'), 'utf8'));
  const md = toMarkdown(demo);
  assert.match(md, /\*\*\[00:07\.5 → 00:13\.5\]\*\* This line sets the TTL/);
  assert.match(md, /_\(pause 3\.0s\)_/);
  assert.match(fullText(demo), /300 seconds/);
});

test('glossary parsing, whisper prompt and misspelling detection', () => {
  const g = parseGlossary('# Terms\n\n- kubectl (avoid: kube control, cube cuddle)\n- `useEffect`\nnot a bullet\n');
  assert.deepEqual(g, [{ term: 'kubectl', avoid: ['kube control', 'cube cuddle'] }, { term: 'useEffect', avoid: [] }]);
  assert.equal(whisperPrompt(g), 'Technical terms used in this video: kubectl, useEffect.');
  assert.deepEqual(findMisspellings('Run Kube Control apply', g), [{ wrong: 'kube control', term: 'kubectl' }]);
  assert.deepEqual(findMisspellings('Run kubectl apply', g), []);
});

test('case-only variants are matched case-sensitively', () => {
  const g = [{ term: 'GitHub', avoid: ['Github', 'git hub'] }];
  assert.deepEqual(findMisspellings('Push to GitHub', g), []);
  assert.deepEqual(findMisspellings('Push to Github', g), [{ wrong: 'Github', term: 'GitHub' }]);
  assert.deepEqual(findMisspellings('Push to Git Hub', g), [{ wrong: 'git hub', term: 'GitHub' }]);
});

test('the repo glossary never flags its own correct spellings', () => {
  const g = loadGlossary();
  for (const { term } of g) assert.deepEqual(findMisspellings(term, g), [], term);
});

test('the repo glossary parses', () => {
  assert.ok(loadGlossary().length > 0);
});
