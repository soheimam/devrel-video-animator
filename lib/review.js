// The review a person sees after a round: everything the web page needs, as plain data, built
// from the edit list. The same facts as report.md and the PR comment, in one JSON file.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml } from './files.js';
import { normalizeEdl, mapTime, pacing, editedDuration } from './edl.js';
import { loadRules } from './rules.js';
import { formatTime } from './time.js';

export function describeCue(cue) {
  const p = cue.params;
  switch (cue.template) {
    case 'callout': return p.text;
    case 'term-definition': return `${p.term}: ${p.gloss}`;
    case 'step-list': return [p.title, (p.steps || []).map((s) => (typeof s === 'string' ? s : s.text)).join(' · ')].filter(Boolean).join(' — ');
    case 'flow-diagram': return (p.nodes || []).map((n) => (typeof n === 'string' ? n : n.label)).join(' → ');
    case 'comparison': return `${p.left?.title} vs ${p.right?.title}`;
    case 'slide': return [p.title, (p.columns || []).map((c) => c.heading).filter(Boolean).join(' · ')].filter(Boolean).join(' — ');
    default: return p.label || cue.template;
  }
}

// urlFor(relativePath) → where that output file can be fetched (a Blob URL or a /local path).
export function buildReview(outDir, urlFor, { round = 1 } = {}) {
  const source = readJson(path.join(outDir, 'source.json'));
  const raw = readYaml(path.join(outDir, 'edits.yaml'));
  const edl = normalizeEdl(raw, loadRules().timing.lead_seconds);
  const has = (rel) => fs.existsSync(path.join(outDir, rel));
  const p = pacing(edl, source.duration);
  const cues = [...edl.cues].sort((a, b) => a.start - b.start);
  return {
    name: path.basename(outDir),
    round,
    source: { duration: source.duration, width: source.width, height: source.height },
    edited: { duration: editedDuration(edl.cuts, source.duration) },
    downloads: {
      video: has('edited.mp4') ? urlFor('edited.mp4') : null,
      srt: has('captions.srt') ? urlFor('captions.srt') : null,
      vtt: has('captions.vtt') ? urlFor('captions.vtt') : null,
      edits: has('edits.yaml') ? urlFor('edits.yaml') : null,
      report: has('report.md') ? urlFor('report.md') : null,
    },
    pacing: {
      perMinute: Number(p.perMinute.toFixed(1)),
      coveredShare: Math.round(p.coveredShare * 100),
      longestGap: { seconds: Math.round(p.longestGap.seconds), at: formatTime(p.longestGap.start) },
    },
    objectives: edl.objectives || [],
    beats: cues.map((c, i) => ({
      id: c.id,
      n: i + 1,
      time: formatTime(c.start),
      editedTime: formatTime(mapTime(c.start, edl.cuts)),
      editedSeconds: Number(mapTime(c.start, edl.cuts).toFixed(2)),
      duration: Number((c.end - c.start).toFixed(1)),
      template: c.template,
      text: describeCue(c),
      rationale: c.rationale || '',
      gif: has(`preview/${c.id}.gif`) ? urlFor(`preview/${c.id}.gif`) : null,
      strip: has(`preview/${c.id}.strip.jpg`) ? urlFor(`preview/${c.id}.strip.jpg`) : null,
    })),
    cuts: [...edl.cuts].sort((a, b) => a.start - b.start).map((c) => ({
      id: c.id,
      from: formatTime(c.start),
      to: formatTime(c.end),
      seconds: Number((c.end - c.start).toFixed(1)),
      reason: c.reason || '',
    })),
    rejected: (edl.rejected || []).map((r) => ({ id: r.id, summary: r.summary, rule: r.rule })),
    warnings: (readJson(path.join(outDir, 'validation.json'), {}).warnings || []).map((w) => `${w.id}: ${w.message}`),
  };
}
