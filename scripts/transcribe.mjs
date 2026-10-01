#!/usr/bin/env node
// Transcribes a video to transcript.json (word timestamps) and transcript.md.
//
// One HTTP call to OpenAI's transcription API (needs OPENAI_API_KEY): no models to download,
// no native binaries. Or import captions your recorder already exported with --from
// (SRT, VTT, or an OpenAI verbose_json file).
//
// Usage: node scripts/transcribe.mjs <video> out/<video> [--from captions.srt] [--language en]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, FFMPEG } from '../lib/ffmpeg.js';
import { writeJson } from '../lib/files.js';
import { fromOpenAI, fromSubtitles, toMarkdown } from '../lib/transcript.js';
import { isMain, parseArgs } from '../lib/cli.js';

export const API_URL = process.env.TRANSCRIBE_URL || 'https://api.openai.com/v1/audio/transcriptions';
export const API_MODEL = process.env.TRANSCRIBE_MODEL || 'whisper-1';

export function importTranscript(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.(srt|vtt)$/i.test(file) || /-->/.test(text)) return fromSubtitles(text);
  const json = JSON.parse(text);
  if (json.words || json.segments?.[0]?.text) return json.segments?.[0]?.words ? json : fromOpenAI(json);
  throw new Error(`Unrecognised transcript format: ${file}`);
}

// Mono 16 kHz Opus keeps a 10-minute talk under 3 MB, well inside the API's 25 MB limit.
async function extractAudio(video) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'audio-')), 'audio.ogg');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '32k', out]);
  return out;
}

export async function transcribeWithApi(video, { language, fetchImpl = fetch } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Set OPENAI_API_KEY to transcribe, or import captions with --from file.srt');
  const audio = await extractAudio(video);
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(audio)], { type: 'audio/ogg' }), 'audio.ogg');
  form.append('model', API_MODEL);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  if (language) form.append('language', language);
  const res = await fetchImpl(API_URL, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`Transcription API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return fromOpenAI(await res.json());
}

export async function transcribe(video, outDir, { from, language, log = console.log } = {}) {
  const transcript = from ? importTranscript(from) : await transcribeWithApi(video, { language });
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
