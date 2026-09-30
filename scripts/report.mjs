#!/usr/bin/env node
// Writes report.md: what the human reviews next to the edited video. Every edit kept,
// every candidate rejected, and what the checks found.
//
// Usage: node scripts/report.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml } from '../lib/files.js';
import { normalizeEdl, mapTime, editedDuration } from '../lib/edl.js';
import { formatTime } from '../lib/time.js';
import { isMain } from '../lib/cli.js';

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function describe(cue) {
  const p = cue.params;
  switch (cue.template) {
    case 'callout': return `“${p.text}”`;
    case 'term-definition': return `**${p.term}**: ${p.gloss}`;
    case 'step-list': return (p.steps || []).map((s) => (typeof s === 'string' ? s : s.text)).join(' → ');
    case 'flow-diagram': return (p.nodes || []).map((n) => (typeof n === 'string' ? n : n.label)).join(' → ');
    case 'comparison': return `${p.left?.title} vs ${p.right?.title}`;
    default: return p.label ? `“${p.label}”` : '';
  }
}

export function buildReport({ source, edl, validation, check, transcript }) {
  const kept = editedDuration(edl.cuts, source.duration);
  const removed = source.duration - kept;
  const L = [];
  L.push(`# Edit report: ${edl.video || path.basename(source.path)}`, '');
  if (transcript?.engine_note) L.push(`> ⚠️ **Transcript quality:** ${transcript.engine_note}`, '');
  L.push(`**${formatTime(source.duration)} → ${formatTime(kept)}** (${removed.toFixed(1)}s removed) · ${edl.cues.length} visual edit(s) · ${edl.cuts.length} cut(s) · ${edl.rejected.length} candidate(s) rejected`, '');

  L.push('## Learning objectives', '', 'What the agents understood this video to teach. Every edit serves one of these.', '');
  edl.objectives.forEach((o, i) => L.push(`${i + 1}. ${o}`));
  L.push('');

  L.push('## Visual edits', '');
  if (!edl.cues.length) L.push('_None. The video already teaches clearly without additions._', '');
  else {
    L.push('| id | edited time | source time | template | shows | gap | objective | why |', '|---|---|---|---|---|---|---|---|');
    for (const c of [...edl.cues].sort((a, b) => a.start - b.start)) {
      L.push(`| ${c.id} | ${formatTime(mapTime(c.start, edl.cuts))} | ${formatTime(c.start)} | ${c.template} | ${cell(describe(c))} | ${c.gap} | ${c.objective} | ${cell(c.rationale)} |`);
    }
    L.push('');
  }

  L.push('## Cuts', '');
  if (!edl.cuts.length) L.push('_None._', '');
  else {
    L.push('| id | source range | length | kind | why |', '|---|---|---|---|---|');
    for (const c of [...edl.cuts].sort((a, b) => a.start - b.start)) {
      L.push(`| ${c.id} | ${formatTime(c.start)}–${formatTime(c.end)} | ${(c.end - c.start).toFixed(1)}s | ${c.kind || ''} | ${cell(c.reason)} |`);
    }
    L.push('');
  }

  L.push('## Rejected candidates', '', 'Ideas the agents considered and dropped, and the rule that dropped them.', '');
  if (!edl.rejected.length) L.push('_None recorded._', '');
  else {
    L.push('| id | kind | idea | rejected by |', '|---|---|---|---|');
    for (const r of edl.rejected) L.push(`| ${r.id || ''} | ${r.kind || ''} | ${cell(r.summary)} | ${cell(r.rule)} |`);
    L.push('');
  }

  const warnings = [
    ...(validation?.warnings || []).map((w) => `${w.id} [${w.rule}] ${w.message}`),
    ...(check?.issues || []).map((i) => `${i.id} [${i.rule}] ${i.message}`),
    ...(check?.findings || []).map((f) => `${f.id} [checker] ${f.finding || f.message}`),
  ];
  L.push('## Checks', '');
  if (!check) L.push('_The rendered video has not been checked yet._', '');
  else if (!warnings.length) L.push('✓ Duration, resolution, audio and layout checks passed.', '');
  warnings.forEach((w) => L.push(`- ${w}`));
  if (warnings.length) L.push('');

  L.push('## Giving notes', '');
  L.push('Reply with notes by id and the agents will revise and re-render, for example:', '');
  L.push('- `drop cue-3`: remove an edit', '- `restore cut-1`: put removed footage back', '- `cue-2 is too early`: adjust timing', '- `cue-4 should say "…"`: change the wording', '');
  L.push('Decisions are logged in `review.yaml` and feed the quality metrics (`npm run metrics`).', '');
  return L.join('\n');
}

export function writeReport(outDir, { log = console.log } = {}) {
  const report = buildReport({
    source: readJson(path.join(outDir, 'source.json')),
    edl: normalizeEdl(readYaml(path.join(outDir, 'edits.yaml'))),
    validation: readJson(path.join(outDir, 'validation.json'), null),
    check: readJson(path.join(outDir, 'check.json'), null),
    transcript: readJson(path.join(outDir, 'transcript.json'), null),
  });
  const file = path.join(outDir, 'report.md');
  fs.writeFileSync(file, report);
  log(`  wrote ${file}`);
  return file;
}

if (isMain(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Usage: node scripts/report.mjs out/<video>');
    process.exit(2);
  }
  writeReport(outDir);
}
