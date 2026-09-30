#!/usr/bin/env node
// Transcribes a video to transcript.json (word-level timestamps) and transcript.md, then
// fixes known mis-hearings of glossary terms.
//
// Engines:
//   transformers  (default) Whisper in Node via Transformers.js; installed by `npm install`.
//                 The model downloads from Hugging Face on first use.
//   whisper       openai-whisper CLI (`pip install openai-whisper`)
//   whisper-cpp   whisper.cpp's `whisper-cli`, with WHISPER_CPP_MODEL=/path/to/ggml-model.bin
//   pocketsphinx  `pip install pocketsphinx`; model bundled, so it works offline, but it is far
//                 less accurate than Whisper. A fallback for when no model host is reachable.
// Or import an existing transcript with --from (any of the formats above, or normalised JSON).
//
// Usage: node scripts/transcribe.mjs <video> out/<video>
//          [--engine transformers|whisper|whisper-cpp|pocketsphinx] [--model base|small|<hf-id>]
//          [--language en] [--from file.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, FFMPEG } from '../lib/ffmpeg.js';
import { readJson, writeJson } from '../lib/files.js';
import { fromOpenAIWhisper, fromWhisperCpp, fromPocketsphinx, toMarkdown } from '../lib/transcript.js';
import { loadGlossary, whisperPrompt, applyGlossary } from '../lib/glossary.js';
import { transcribeWithTransformers } from '../lib/whisper.js';
import { isMain, parseArgs } from '../lib/cli.js';
import { ROOT } from '../lib/paths.js';

export const ENGINES = ['transformers', 'whisper', 'whisper-cpp', 'pocketsphinx'];

export function normalizeAny(json) {
  if (json.transcription) return fromWhisperCpp(json);
  if (json.segments) return fromOpenAIWhisper(json);
  throw new Error('Unrecognised transcript format.');
}

async function withOpenAIWhisper(video, model = 'small', prompt, language) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));
  const args = [video, '--model', model, '--word_timestamps', 'True', '--output_format', 'json', '--output_dir', tmp];
  if (prompt) args.push('--initial_prompt', prompt);
  if (language) args.push('--language', language);
  await run('whisper', args);
  const file = fs.readdirSync(tmp).find((f) => f.endsWith('.json'));
  return fromOpenAIWhisper(readJson(path.join(tmp, file)));
}

async function withWhisperCpp(video, prompt, language) {
  const model = process.env.WHISPER_CPP_MODEL;
  if (!model) throw new Error('Set WHISPER_CPP_MODEL to a ggml model file to use whisper.cpp.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));
  const wav = path.join(tmp, 'audio.wav');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-ar', '16000', '-ac', '1', wav]);
  const args = ['-m', model, '-f', wav, '-ml', '1', '-sow', '-oj', '-of', path.join(tmp, 'out')];
  if (prompt) args.push('--prompt', prompt);
  if (language) args.push('-l', language);
  await run('whisper-cli', args);
  return fromWhisperCpp(readJson(path.join(tmp, 'out.json')));
}

async function withPocketsphinx(video) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sphinx-'));
  const raw = path.join(tmp, 'audio.raw');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', raw]);
  const script = path.join(ROOT, 'scripts', 'engines', 'pocketsphinx_transcribe.py');
  const { stdout } = await run(process.env.PYTHON || 'python3', [script, raw]).catch((e) => {
    throw new Error(`PocketSphinx failed (is it installed? pip install pocketsphinx)\n${e.message}`);
  });
  return fromPocketsphinx(JSON.parse(stdout));
}

export async function transcribe(video, outDir, { engine = 'transformers', model, language, from, log = console.log } = {}) {
  const glossary = loadGlossary();
  let transcript;
  if (from) {
    transcript = normalizeAny(readJson(from));
  } else if (engine === 'transformers') {
    transcript = await transcribeWithTransformers(video, { model, language, log });
  } else if (engine === 'whisper') {
    transcript = await withOpenAIWhisper(video, model, whisperPrompt(glossary), language);
  } else if (engine === 'whisper-cpp') {
    transcript = await withWhisperCpp(video, whisperPrompt(glossary), language);
  } else if (engine === 'pocketsphinx') {
    transcript = await withPocketsphinx(video);
    transcript.engine_note = 'PocketSphinx fallback: expect many wrong words. Trust on-screen text (frames, OCR) over this transcript; use it mainly for timing.';
  } else {
    throw new Error(`Unknown engine "${engine}". Use one of: ${ENGINES.join(', ')}.`);
  }
  const corrections = applyGlossary(transcript, glossary);
  if (corrections.length) transcript.corrections = corrections;
  writeJson(path.join(outDir, 'transcript.json'), transcript);
  fs.writeFileSync(path.join(outDir, 'transcript.md'), toMarkdown(transcript, `Transcript: ${path.basename(video)}`));
  log(`  transcript: ${transcript.segments.length} segments${corrections.length ? `, ${corrections.length} glossary correction(s)` : ''}`);
  return transcript;
}

if (isMain(import.meta.url)) {
  const { positional: [video, outDir], flags } = parseArgs(process.argv.slice(2));
  if (!video || !outDir) {
    console.error('Usage: node scripts/transcribe.mjs <video> out/<video> [--engine transformers|whisper|whisper-cpp|pocketsphinx] [--model base] [--language en] [--from file.json]');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  transcribe(video, outDir, { engine: flags.engine, model: flags.model, language: flags.language, from: flags.from }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
