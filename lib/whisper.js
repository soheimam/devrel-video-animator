// Speech-to-text with Whisper running in Node via Transformers.js (ONNX Runtime, CPU).
// It installs with `npm install`; no Python. The model downloads from Hugging Face on
// first use and is cached in .cache/models/.
import path from 'node:path';
import { FFMPEG, runBinary } from './ffmpeg.js';
import { ROOT } from './paths.js';
import { fromTransformers } from './transcript.js';

// Word-level timestamps need a Whisper export that includes alignment heads; the
// onnx-community "_timestamped" models are built for exactly that.
export const DEFAULT_MODEL = 'onnx-community/whisper-base_timestamped';
export const SAMPLE_RATE = 16000;

// Accepts a short size name ("base", "small.en") or a full Hugging Face model id.
export function resolveModel(name = process.env.WHISPER_MODEL) {
  if (!name) return DEFAULT_MODEL;
  if (/^(tiny|base|small|medium)(\.en)?$/.test(name)) return `onnx-community/whisper-${name}_timestamped`;
  return name;
}

// Mono 16 kHz float samples, which is what Whisper expects.
export async function decodeAudio(file) {
  const buf = await runBinary(FFMPEG, [
    '-loglevel', 'error', '-i', file,
    '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', '-',
  ]);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export async function loadTranscriber(model, { dtype = process.env.WHISPER_DTYPE, log = console.log } = {}) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path.join(ROOT, '.cache', 'models');
  let announced = false;
  return pipeline('automatic-speech-recognition', model, {
    ...(dtype ? { dtype } : {}),
    progress_callback: (p) => {
      if (p.status === 'download' && !announced) {
        announced = true;
        log(`  downloading ${model} (first run only; cached in .cache/models/)`);
      }
    },
  });
}

export async function transcribeWithTransformers(file, { model, language, log = console.log } = {}) {
  const id = resolveModel(model);
  let transcriber;
  try {
    transcriber = await loadTranscriber(id, { log });
  } catch (e) {
    throw new Error(`Could not load Whisper model ${id}: ${e.message}\nIt downloads from huggingface.co on first use; check network access, or set WHISPER_MODEL.`);
  }
  const audio = await decodeAudio(file);
  log(`  transcribing ${(audio.length / SAMPLE_RATE).toFixed(0)}s of audio with ${id}`);
  const output = await transcriber(audio, {
    return_timestamps: 'word',
    chunk_length_s: 30,
    stride_length_s: 5,
    ...(language ? { language, task: 'transcribe' } : {}),
  });
  await transcriber.dispose?.();
  return fromTransformers(output, language || 'auto');
}
