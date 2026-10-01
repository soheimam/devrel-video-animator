#!/usr/bin/env node
// Makes an animated GIF of every visual edit (preview/<id>.gif), cut from the edited video
// with half a second either side, so a reviewer can see each animation inline in a PR or in
// report.md without downloading the video.
//
// Usage: node scripts/previews.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readYaml } from '../lib/files.js';
import { normalizeEdl, mapTime } from '../lib/edl.js';
import { FFMPEG, run, probe } from '../lib/ffmpeg.js';
import { isMain } from '../lib/cli.js';
import { loadRules } from '../lib/rules.js';

export async function makePreviews(outDir, { width = 720, fps = 12, log = console.log } = {}) {
  const edl = normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')), loadRules().timing.lead_seconds);
  const video = path.join(outDir, 'edited.mp4');
  const dir = path.join(outDir, 'preview');
  fs.rmSync(dir, { recursive: true, force: true });
  if (!edl.cues.length) return [];
  fs.mkdirSync(dir, { recursive: true });
  const { duration } = await probe(video);
  const made = [];
  for (const cue of [...edl.cues].sort((a, b) => a.start - b.start)) {
    const start = Math.max(0, mapTime(cue.start, edl.cuts) - 0.5);
    const end = Math.min(duration, mapTime(cue.end, edl.cuts) + 0.5);
    const file = path.join(dir, `${cue.id}.gif`);
    await run(FFMPEG, [
      '-y', '-loglevel', 'error', '-ss', start.toFixed(3), '-t', (end - start).toFixed(3), '-i', video,
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
      file,
    ]);
    made.push({ id: cue.id, file: path.relative(outDir, file) });
  }
  log(`  previews: ${made.length} GIF(s) in ${path.relative(process.cwd(), dir) || dir}`);
  return made;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Usage: node scripts/previews.mjs out/<video>');
    process.exit(2);
  }
  makePreviews(outDir).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
