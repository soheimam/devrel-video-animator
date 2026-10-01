import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fromOpenAI, fromAiSdk, fromSubtitles, groupWords, toMarkdown, fullText } from '../lib/transcript.js';
import { importTranscript, transcribeWithAiSdk, PROVIDERS } from '../scripts/transcribe.mjs';
import { makeDemoVideo } from '../scripts/demo.mjs';
import { hasFfmpeg } from './helpers.mjs';
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

test('AI SDK result with word-level segments (OpenAI word granularity)', () => {
  const t = fromAiSdk({
    text: 'Set the TTL. Then deploy',
    language: 'en',
    segments: [
      { text: 'Set', startSecond: 0, endSecond: 0.3 }, { text: 'the', startSecond: 0.3, endSecond: 0.5 },
      { text: 'TTL.', startSecond: 0.5, endSecond: 1 }, { text: 'Then', startSecond: 2.5, endSecond: 2.8 },
      { text: 'deploy', startSecond: 2.8, endSecond: 3.4 },
    ],
  });
  assert.equal(t.language, 'en');
  assert.deepEqual(t.segments.map((s) => s.text), ['Set the TTL.', 'Then deploy']);
  assert.deepEqual(t.segments[0].words[2], { word: 'TTL.', start: 0.5, end: 1 });
});

test('AI SDK result with phrase segments spreads words across each phrase', () => {
  const t = fromAiSdk({ text: 'Set the TTL.', segments: [{ text: ' Set the TTL. ', startSecond: 1, endSecond: 4 }] });
  assert.deepEqual(t.segments[0].words.map((w) => [w.word, w.start]), [['Set', 1], ['the', 2], ['TTL.', 3]]);
  assert.deepEqual(fromAiSdk({ text: '', segments: [] }).segments, []);
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

test('transcription asks the provider for word timestamps and needs a key', { skip: !hasFfmpeg && 'needs ffmpeg' }, async () => {
  const video = await makeDemoVideo(path.join(tmpDir('dva-sdk-'), 'demo.mp4'));
  const saved = { ...process.env };
  try {
    delete process.env.OPENAI_API_KEY;
    process.env.TRANSCRIBE_PROVIDER = 'openai';
    await assert.rejects(transcribeWithAiSdk(video, {}), /OPENAI_API_KEY/);
    process.env.TRANSCRIBE_PROVIDER = 'nope';
    await assert.rejects(transcribeWithAiSdk(video, {}), /Unknown TRANSCRIBE_PROVIDER/);

    process.env.TRANSCRIBE_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test';
    let call;
    const t = await transcribeWithAiSdk(video, {
      language: 'en',
      transcribeFn: async (args) => {
        call = args;
        return { text: 'Hello there', language: 'en', segments: [{ text: 'Hello', startSecond: 0, endSecond: 0.4 }, { text: 'there', startSecond: 0.4, endSecond: 0.8 }], warnings: [] };
      },
    });
    assert.equal(call.model.modelId, PROVIDERS.openai.model);
    assert.deepEqual(call.providerOptions.openai.timestampGranularities, ['word']);
    assert.equal(call.providerOptions.openai.language, 'en');
    assert.ok(call.audio.length > 1000, 'audio was extracted and passed as bytes');
    assert.equal(t.segments[0].text, 'Hello there');

    process.env.TRANSCRIBE_PROVIDER = 'gateway';
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(transcribeWithAiSdk(video, {}), /AI_GATEWAY_API_KEY/);
    process.env.AI_GATEWAY_API_KEY = 'test';
    await transcribeWithAiSdk(video, { transcribeFn: async (args) => ((call = args), { text: '', segments: [], warnings: [] }) });
    assert.equal(call.model, 'openai/whisper-1', 'gateway models are plain strings');
  } finally {
    process.env = saved;
  }
});
