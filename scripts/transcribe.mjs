#!/usr/bin/env node
// Transcribes a video to transcript.json (word timestamps) and transcript.md, through the
// Vercel AI SDK's transcription call: one request to a hosted provider, no models to
// download. Or import captions your recorder already exported with --from (SRT, VTT, or
// an OpenAI verbose_json file).
//
// Configure in .env (see .env.example):
//   AI_GATEWAY_API_KEY | OPENAI_API_KEY | DEEPGRAM_API_KEY   set one; the provider follows the key
//   TRANSCRIBE_PROVIDER  gateway | openai | deepgram          only needed if more than one key is set
//   TRANSCRIBE_MODEL     default openai/whisper-1 (gateway), whisper-1 (openai), nova-3 (deepgram)
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

// Reads .env from the repo root into process.env (values already set win). Safe to call twice.
export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  if (typeof process.loadEnvFile === 'function') return process.loadEnvFile(file);
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

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
  // A string model id resolves through the AI Gateway: 'provider/model'.
  gateway: {
    key: 'AI_GATEWAY_API_KEY',
    model: 'openai/whisper-1',
    load: () => ({ transcription: (id) => id }),
    options: (language) => ({ openai: { timestampGranularities: ['word'], ...(language ? { language } : {}) } }),
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

// The provider follows whichever key is set; TRANSCRIBE_PROVIDER only decides between several.
export function pickProvider(env = process.env) {
  const keys = Object.keys(PROVIDERS);
  if (env.TRANSCRIBE_PROVIDER) {
    const name = env.TRANSCRIBE_PROVIDER;
    if (!PROVIDERS[name]) throw new Error(`Unknown TRANSCRIBE_PROVIDER "${name}". Use one of: ${keys.join(', ')}.`);
    if (!env[PROVIDERS[name].key]) throw new Error(`TRANSCRIBE_PROVIDER=${name} but ${PROVIDERS[name].key} is not set in .env.`);
    return name;
  }
  const withKey = keys.filter((k) => env[PROVIDERS[k].key]);
  if (withKey.length === 0) {
    throw new Error(`No transcription key found. Set one of ${keys.map((k) => PROVIDERS[k].key).join(', ')} in .env (see .env.example), or import captions with --from file.srt`);
  }
  if (withKey.length > 1) {
    throw new Error(`Several transcription keys are set (${withKey.map((k) => PROVIDERS[k].key).join(', ')}). Set TRANSCRIBE_PROVIDER=${withKey[0]} (or another) to choose.`);
  }
  return withKey[0];
}

export async function transcribeWithAiSdk(video, { language, transcribeFn } = {}) {
  const name = pickProvider();
  const provider = PROVIDERS[name];
  const modelId = process.env.TRANSCRIBE_MODEL || provider.model;
  const transcribe = transcribeFn || (await import('ai')).transcribe;
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
