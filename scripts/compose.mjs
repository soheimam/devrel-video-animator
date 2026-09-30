#!/usr/bin/env node
// Applies the edit decision list to the source video in one ffmpeg pass:
//   constant frame rate → zooms → overlays (at their source times) → cuts.
// Everything happens on the source timeline, then the cuts are removed, so cues never
// need re-timing. Audio is copied untouched when there are no cuts.
//
// Usage: node scripts/compose.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml } from '../lib/files.js';
import { normalizeEdl, overlayCues, zoomCues, sortedCuts } from '../lib/edl.js';
import { designSpace } from '../lib/design.js';
import { loadRules } from '../lib/rules.js';
import { zoomExpressions } from '../lib/zoom.js';
import { FFMPEG, run } from '../lib/ffmpeg.js';
import { isMain } from '../lib/cli.js';

export function buildCommand({ source, edl, rules, outDir, output }) {
  const { width: W, height: H, fps } = source;
  const design = designSpace(W, H);
  const inputs = ['-i', source.path];
  const graph = [];

  let chain = `[0:v]fps=${fps},setsar=1`;
  const zoom = zoomExpressions(zoomCues(edl), design, rules);
  if (zoom) {
    chain += `,zoompan=z='${zoom.z}':x='${zoom.x}':y='${zoom.y}':d=1:s=${W}x${H}:fps=${fps}`;
  }
  graph.push(`${chain}[base]`);

  let last = 'base';
  overlayCues(edl).forEach((cue, i) => {
    const k = i + 1;
    inputs.push('-i', path.join(outDir, 'overlays', `${cue.id}.mov`));
    const s = cue.start.toFixed(4);
    const e = cue.end.toFixed(4);
    graph.push(`[${k}:v]scale=${W}:${H},format=rgba,setpts=PTS-STARTPTS+${s}/TB[o${k}]`);
    graph.push(`[${last}][o${k}]overlay=0:0:eof_action=pass:enable='between(t,${s},${e})'[v${k}]`);
    last = `v${k}`;
  });

  const cuts = sortedCuts(edl.cuts);
  const audio = [];
  if (cuts.length) {
    const drop = cuts.map((c) => `between(t,${c.start.toFixed(4)},${c.end.toFixed(4)})`).join('+');
    graph.push(`[${last}]select='not(${drop})',setpts=N/(${fps}*TB),format=yuv420p[vout]`);
    if (source.hasAudio) {
      graph.push(`[0:a]aselect='not(${drop})',asetpts=N/SR/TB[aout]`);
      audio.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k');
    }
  } else {
    graph.push(`[${last}]format=yuv420p[vout]`);
    if (source.hasAudio) audio.push('-map', '0:a', '-c:a', 'copy');
  }

  return [
    '-y', '-loglevel', 'error',
    ...inputs,
    '-filter_complex', graph.join(';'),
    '-map', '[vout]',
    ...audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps),
    '-movflags', '+faststart',
    output,
  ];
}

export async function compose(outDir, { log = console.log } = {}) {
  const source = readJson(path.join(outDir, 'source.json'));
  const edl = normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')));
  const output = path.join(outDir, 'edited.mp4');
  // "No changes" hands back the original, bit for bit, not a re-encode.
  if (!edl.cues.length && !edl.cuts.length) {
    fs.copyFileSync(source.path, output);
    log(`  no edits: copied the source to ${output}`);
    return output;
  }
  for (const cue of overlayCues(edl)) {
    if (!fs.existsSync(path.join(outDir, 'overlays', `${cue.id}.mov`))) {
      throw new Error(`Missing overlay for ${cue.id}. Run render-overlays first.`);
    }
  }
  await run(FFMPEG, buildCommand({ source, edl, rules: loadRules(), outDir, output }));
  log(`  wrote ${output}`);
  return output;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Usage: node scripts/compose.mjs out/<video>');
    process.exit(2);
  }
  compose(outDir).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
