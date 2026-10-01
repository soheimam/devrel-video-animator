#!/usr/bin/env node
// Transcribes a video to transcript.json (word timestamps) and transcript.md, through the
// Vercel AI SDK's transcription call: one request to a hosted provider, no models to
// download. Or import captions your recorder already exported with --from (SRT, VTT, or
// an OpenAI verbose_json file).
//
// Configure in .env (see .env.example):
//   TRANSCRIBE_PROVIDER  openai (default) | deepgram
//   TRANSCRIBE_MODEL     default whisper-1 for openai, nova-3 for deepgram
//   OPENAI_API_KEY / DEEPGRAM_API_KEY
//
// Usage: node scripts/transcribe.mjs <video> out/<video> [--from captions.srt] [--language en]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, FFMPEG } from '../lib/ffmpeg.js';
import { writeJson } from '../lib/files.js';
import { fromAiSdk, fromOpenAI, fromSubtitles, toMarkdown } from '../lib/transcript.js';
import { ROOT } from '../lib/paths.js';
import { isMain, parseArgs } from '../lib/cli.js';

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // no .env: rely on the environment
}

export const PROVIDERS = {
  openai: {
    key: 'OPENAI_API_KEY',
    model: 'whisper-1',
    load: () => import('@ai-sdk/openai').then((m) => m.openai),
    // Word-level timestamps. Asking for segments too would make the SDK return phrases.
    options: (language) => ({ openai: { timestampGranularities: ['word'], ...(language ? { language } : {}) } }),
  },
  deepgram: {
    key: 'DEEPGRAM_API_KEY',
    model: 'nova-3',
    load: () => import('@ai-sdk/deepgram').then((m) => m.deepgram),
    options: (language) => ({ deepgram: { smartFormat: true, punctuate: true, ...(language ? { language } : {}) } }),
  },
};

export function importTranscript(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.(srt|vtt)$/i.test(file) || /-->/.test(text)) return fromSubtitles(text);
  const json = JSON.parse(text);
  if (json.segments?.[0]?.words) return json;
  if (json.words || json.segments?.[0]?.text) return fromOpenAI(json);
  throw new Error(`Unrecognised transcript format: ${file}`);
}

// Mono 16 kHz Opus keeps a 10-minute talk under 3 MB.
async function extractAudio(video) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'audio-')), 'audio.ogg');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '32k', out]);
  return out;
}

export async function transcribeWithAiSdk(video, { language, transcribeFn } = {}) {
  const name = process.env.TRANSCRIBE_PROVIDER || 'openai';
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown TRANSCRIBE_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(', ')}.`);
  if (!process.env[provider.key]) {
    throw new Error(`Set ${provider.key} in .env to transcribe (see .env.example), or import captions with --from file.srt`);
  }
  const modelId = process.env.TRANSCRIBE_MODEL || provider.model;
  const transcribe = transcribeFn || (await import('ai')).experimental_transcribe;
  const sdk = await provider.load();
  const result = await transcribe({
    model: sdk.transcription(modelId),
    audio: fs.readFileSync(await extractAudio(video)),
    providerOptions: provider.options(language),
  });
  for (const w of result.warnings || []) console.warn(`  warning from ${name}: ${w.message || JSON.stringify(w)}`);
  return fromAiSdk(result);
}

export async function transcribe(video, outDir, { from, language, log = console.log } = {}) {
  const transcript = from ? importTranscript(from) : await transcribeWithAiSdk(video, { language });
  writeJson(path.join(outDir, 'transcript.json'), transcript);
  fs.writeFileSync(path.join(outDir, 'transcript.md'), toMarkdown(transcript, `Transcript: ${path.basename(video)}`));
  log(`  transcript: ${transcript.segments.length} segments${from ? ` (imported from ${path.basename(from)})` : ''}`);
  return transcript;
}

if (isMain(import.meta.url)) {
  const { positional: [video, outDir], flags } = parseArgs(process.argv.slice(2));
  if (!video || !outDir) {
    console.error('Usage: node scripts/transcribe.mjs <video> out/<video> [--from captions.srt] [--language en]');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  transcribe(video, outDir, { from: flags.from, language: flags.language }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
