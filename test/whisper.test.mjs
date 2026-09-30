import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveModel, decodeAudio, DEFAULT_MODEL, SAMPLE_RATE, transcribeWithTransformers } from '../lib/whisper.js';
import { fromTransformers } from '../lib/transcript.js';
import { applyGlossary } from '../lib/glossary.js';
import { transcribe } from '../scripts/transcribe.mjs';
import { makeDemoVideo } from '../scripts/demo.mjs';
import { hasFfmpeg, tmpDir } from './helpers.mjs';

test('model names: default, short sizes and full ids', () => {
  assert.equal(resolveModel(undefined), process.env.WHISPER_MODEL || DEFAULT_MODEL);
  assert.equal(resolveModel('small'), 'onnx-community/whisper-small_timestamped');
  assert.equal(resolveModel('base.en'), 'onnx-community/whisper-base.en_timestamped');
  assert.equal(resolveModel('someone/custom-whisper'), 'someone/custom-whisper');
});

test('Transformers.js word chunks become sentence segments', () => {
  const t = fromTransformers({
    text: ' Set the TTL. Then deploy',
    chunks: [
      { text: ' Set', timestamp: [0.0, 0.3] },
      { text: ' the', timestamp: [0.3, 0.5] },
      { text: ' TTL.', timestamp: [0.5, 1.0] },
      { text: ' Then', timestamp: [2.5, 2.8] },
      { text: ' deploy', timestamp: [2.8, null] },
    ],
  }, 'en');
  assert.equal(t.language, 'en');
  assert.deepEqual(t.segments.map((s) => s.text), ['Set the TTL.', 'Then deploy']);
  assert.ok(Math.abs(t.segments[1].end - 3.1) < 1e-9, 'a missing final end gets a short duration');
});

test('glossary corrections fix single- and multi-word mis-hearings, keeping timing and punctuation', () => {
  const transcript = {
    segments: [{
      start: 0, end: 4, text: 'Run kube control apply, then check Github.',
      words: [
        { word: 'Run', start: 0, end: 0.4 },
        { word: 'kube', start: 0.4, end: 0.8 },
        { word: 'control', start: 0.8, end: 1.2 },
        { word: 'apply,', start: 1.2, end: 1.6 },
        { word: 'then', start: 1.6, end: 2 },
        { word: 'check', start: 2, end: 2.5 },
        { word: 'Github.', start: 2.5, end: 3 },
      ],
    }],
  };
  const corrections = applyGlossary(transcript, [
    { term: 'kubectl', avoid: ['kube control'] },
    { term: 'GitHub', avoid: ['Github'] },
  ]);
  const seg = transcript.segments[0];
  assert.equal(seg.text, 'Run kubectl apply, then check GitHub.');
  assert.deepEqual(seg.words[1], { word: 'kubectl', start: 0.4, end: 1.2 });
  assert.equal(seg.words.at(-1).word, 'GitHub.');
  assert.deepEqual(corrections.map((c) => [c.from, c.to]), [['kube control', 'kubectl'], ['Github.', 'GitHub']]);
});

test('glossary corrections leave correct spellings alone', () => {
  const transcript = { segments: [{ text: 'Push to GitHub', words: [{ word: 'Push', start: 0, end: 1 }, { word: 'to', start: 1, end: 2 }, { word: 'GitHub', start: 2, end: 3 }] }] };
  assert.deepEqual(applyGlossary(transcript, [{ term: 'GitHub', avoid: ['Github'] }]), []);
  assert.equal(transcript.segments[0].text, 'Push to GitHub');
});

test('audio is decoded to 16 kHz mono floats', { skip: !hasFfmpeg && 'needs ffmpeg' }, async () => {
  const video = await makeDemoVideo(path.join(tmpDir('dva-audio-'), 'demo.mp4'));
  const audio = await decodeAudio(video);
  assert.ok(Math.abs(audio.length / SAMPLE_RATE - 23) < 0.1, `${audio.length / SAMPLE_RATE}s`);
  const rms = (from, to) => {
    let sum = 0;
    for (let i = from * SAMPLE_RATE; i < to * SAMPLE_RATE; i++) sum += audio[i] ** 2;
    return Math.sqrt(sum / ((to - from) * SAMPLE_RATE));
  };
  assert.ok(rms(1, 3) > 0.01, 'tone where the demo "speaks"');
  assert.ok(rms(5, 7) < 0.001, 'silence in the pause');
});

test('imported transcripts get glossary corrections too', async () => {
  const dir = tmpDir('dva-tx-');
  const from = path.join(dir, 'in.json');
  fs.writeFileSync(from, JSON.stringify({
    segments: [{ start: 0, end: 2, text: 'Open cube control', words: [
      { word: 'Open', start: 0, end: 0.5 }, { word: 'cube', start: 0.5, end: 1 }, { word: 'control', start: 1, end: 2 },
    ] }],
  }));
  const t = await transcribe('talk.mp4', dir, { from, log: () => {} });
  assert.equal(t.segments[0].text, 'Open kubectl');
  assert.match(fs.readFileSync(path.join(dir, 'transcript.md'), 'utf8'), /Open kubectl/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'transcript.json'), 'utf8')).corrections.length, 1);
});

// Real transcription downloads a model (~300 MB) on first run, so it is opt-in:
//   WHISPER_E2E=1 npm test
const tts = ['say', 'espeak-ng', 'espeak'].find((cmd) => {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

test('transcribes real speech with word timestamps', {
  skip: !process.env.WHISPER_E2E ? 'set WHISPER_E2E=1 to run (downloads the model)' : !tts ? 'needs say or espeak-ng' : !hasFfmpeg && 'needs ffmpeg',
  timeout: 600000,
}, async () => {
  const dir = tmpDir('dva-speech-');
  const wav = path.join(dir, 'speech.wav');
  const line = 'The edge cache keeps each response for five minutes.';
  if (tts === 'say') execFileSync('say', ['-o', path.join(dir, 'speech.aiff'), line]), execFileSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(dir, 'speech.aiff'), wav]);
  else execFileSync(tts, ['-w', wav, line]);
  const t = await transcribeWithTransformers(wav, { language: 'en', log: () => {} });
  const words = t.segments.flatMap((s) => s.words);
  const text = words.map((w) => w.word).join(' ').toLowerCase();
  assert.match(text, /cache/);
  assert.match(text, /minutes/);
  for (let i = 1; i < words.length; i++) assert.ok(words[i].start >= words[i - 1].start, 'timestamps increase');
});
