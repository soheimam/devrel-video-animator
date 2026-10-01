import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EDITORIAL = path.join(ROOT, 'editorial');

// Every video gets its own working folder under out/, named after the file.
export function slugFor(videoPath) {
  return path
    .basename(videoPath, path.extname(videoPath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// The recording a source.json points at. Ingest may have run on another machine (the
// transcript is pushed, the render happens elsewhere), so an absolute path that no longer
// exists falls back to the same file name under videos/.
export function sourceVideo(source) {
  const candidates = [
    source.path,
    path.resolve(ROOT, source.path),
    path.join(ROOT, 'videos', path.basename(source.path)),
  ];
  const found = candidates.find((c) => c && fs.existsSync(c));
  if (!found) throw new Error(`Recording not found: ${source.path} (also looked in videos/). Copy the MP4 into videos/.`);
  return found;
}
