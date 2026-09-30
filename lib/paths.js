import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
