#!/usr/bin/env node
// Transcribes a video to transcript.json (word-level timestamps) and transcript.md.
// Uses whichever Whisper is installed:
//   - openai-whisper   (`pip install openai-whisper`, provides `whisper`)
//   - whisper.cpp      (`whisper-cli`, with WHISPER_CPP_MODEL=/path/to/ggml-model.bin)
// Or pass an existing transcript with --from (openai-whisper, whisper.cpp or normalised JSON).
// The glossary is given to Whisper as a prompt so technical terms are spelled right.
//
// Usage: node scripts/transcribe.mjs <video> out/<video> [--model small] [--from file.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, FFMPEG } from '../lib/ffmpeg.js';
import { readJson, writeJson } from '../lib/files.js';
import { fromOpenAIWhisper, fromWhisperCpp, toMarkdown } from '../lib/transcript.js';
import { loadGlossary, whisperPrompt } from '../lib/glossary.js';
import { isMain, parseArgs } from '../lib/cli.js';

const available = (cmd) => run(cmd, ['--help']).then(() => true, () => false);

export function normalizeAny(json) {
  if (json.transcription) return fromWhisperCpp(json);
  if (json.segments) return fromOpenAIWhisper(json);
  throw new Error('Unrecognised transcript format.');
}

async function withOpenAIWhisper(video, model, prompt) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));
  const args = [video, '--model', model, '--word_timestamps', 'True', '--output_format', 'json', '--output_dir', tmp];
  if (prompt) args.push('--initial_prompt', prompt);
  await run('whisper', args);
  const file = fs.readdirSync(tmp).find((f) => f.endsWith('.json'));
  return fromOpenAIWhisper(readJson(path.join(tmp, file)));
}

async function withWhisperCpp(video, prompt) {
  const model = process.env.WHISPER_CPP_MODEL;
  if (!model) throw new Error('Set WHISPER_CPP_MODEL to a ggml model file to use whisper.cpp.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));
  const wav = path.join(tmp, 'audio.wav');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-ar', '16000', '-ac', '1', wav]);
  const args = ['-m', model, '-f', wav, '-ml', '1', '-sow', '-oj', '-of', path.join(tmp, 'out')];
  if (prompt) args.push('--prompt', prompt);
  await run('whisper-cli', args);
  return fromWhisperCpp(readJson(path.join(tmp, 'out.json')));
}

export async function transcribe(video, outDir, { model = 'small', from, log = console.log } = {}) {
  let transcript;
  if (from) {
    transcript = normalizeAny(readJson(from));
  } else {
    const prompt = whisperPrompt(loadGlossary());
    if (await available('whisper')) {
      transcript = await withOpenAIWhisper(video, model, prompt);
    } else if (await available('whisper-cli')) {
      transcript = await withWhisperCpp(video, prompt);
    } else {
      throw new Error('No Whisper found. Install openai-whisper (`pip install openai-whisper`) or whisper.cpp, or pass --from transcript.json.');
    }
  }
  writeJson(path.join(outDir, 'transcript.json'), transcript);
  fs.writeFileSync(path.join(outDir, 'transcript.md'), toMarkdown(transcript, `Transcript: ${path.basename(video)}`));
  log(`  transcript: ${transcript.segments.length} segments`);
  return transcript;
}

if (isMain(import.meta.url)) {
  const { positional: [video, outDir], flags } = parseArgs(process.argv.slice(2));
  if (!video || !outDir) {
    console.error('Usage: node scripts/transcribe.mjs <video> out/<video> [--model small] [--from file.json]');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  transcribe(video, outDir, { model: flags.model, from: flags.from }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
