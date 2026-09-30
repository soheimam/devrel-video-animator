import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRules } from '../lib/rules.js';

export const rules = loadRules();

export const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

export const hasBrowser = await import('playwright').then(
  async ({ chromium }) => {
    try {
      const b = await chromium.launch();
      await b.close();
      return true;
    } catch {
      return false;
    }
  },
  () => false,
);

export function tmpDir(prefix = 'dva-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// A small grayscale thumbnail of one frame, for pixel comparisons.
export function grayFrame(video, t, w = 160, h = 90) {
  return execFileSync('ffmpeg', [
    '-loglevel', 'error', '-ss', String(t), '-i', video, '-frames:v', '1',
    '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
  ]);
}

export function meanDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

// Counts pixels with any opacity in a transparent PNG screenshot.
export function opaquePixels(png) {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', '-', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {
    input: png,
    maxBuffer: 256 * 1024 * 1024,
  });
  let n = 0;
  for (let i = 3; i < raw.length; i += 4) if (raw[i] > 8) n++;
  return n;
}

// A minimal valid edit list for a 60s 1920x1080 video; tests override pieces of it.
export function baseEdl(overrides = {}) {
  return {
    video: 'test.mp4',
    objectives: ['Understand the request flow'],
    cuts: [],
    cues: [],
    rejected: [],
    ...overrides,
  };
}

export const video1080 = { width: 1920, height: 1080, duration: 60 };
