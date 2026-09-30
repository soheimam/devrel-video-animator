// Builds ffmpeg zoompan expressions for zoom cues. Each zoom eases in over a short ramp
// (smoothstep), holds, and eases back out. Zooms never overlap (one focus at a time), so
// their contributions can simply be summed.
import { zoomFactor } from './edl.js';

const n = (v) => Number(v.toFixed(4));

export function zoomExpressions(zooms, design, rules) {
  if (!zooms.length) return null;
  const r = rules.zoom.ramp_seconds;
  const zTerms = [];
  const xParts = [];
  const yParts = [];
  for (const cue of zooms) {
    const { x, y, w, h } = cue.params.region;
    const factor = zoomFactor(cue.params.region, design, rules);
    const s = n(cue.start);
    const e = n(cue.end);
    // m rises 0→1 over the first ramp and falls 1→0 over the last one.
    const m = `min(clip((it-${s})/${r},0,1),clip((${e}-it)/${r},0,1))`;
    zTerms.push(`${n(factor - 1)}*(${m})*(${m})*(3-2*(${m}))`);
    // Region centre in source pixels (design pixels × scale).
    const cx = n((x + w / 2) * design.scale);
    const cy = n((y + h / 2) * design.scale);
    xParts.push([s, e, `clip(${cx}-iw/zoom/2,0,iw-iw/zoom)`]);
    yParts.push([s, e, `clip(${cy}-ih/zoom/2,0,ih-ih/zoom)`]);
  }
  const chain = (parts) =>
    parts.reduceRight((acc, [s, e, expr]) => `if(between(it,${s},${e}),${expr},${acc})`, '0');
  return { z: `1+${zTerms.join('+')}`, x: chain(xParts), y: chain(yParts) };
}
