#!/usr/bin/env node
// Writes report.md: what the human reviews next to the edited video. Every suggestion,
// with a GIF preview, and every idea that was considered and left out.
//
// Usage: node scripts/report.mjs out/<video>
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readYaml } from '../lib/files.js';
import { normalizeEdl, mapTime, editedDuration, pacing } from '../lib/edl.js';
import { formatTime } from '../lib/time.js';
import { isMain } from '../lib/cli.js';
import { loadRules } from '../lib/rules.js';

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function describe(cue) {
  const p = cue.params;
  switch (cue.template) {
    case 'callout': return `“${p.text}”`;
    case 'term-definition': return `**${p.term}**: ${p.gloss}`;
    case 'step-list': return (p.steps || []).map((s) => (typeof s === 'string' ? s : s.text)).join(' → ');
    case 'flow-diagram': return (p.nodes || []).map((n) => (typeof n === 'string' ? n : n.label)).join(' → ');
    case 'comparison': return `${p.left?.title} vs ${p.right?.title}`;
    case 'slide': return `**${p.title}**: ${(p.columns || []).map((c) => c.heading).filter(Boolean).join(' · ')}`;
    default: return p.label ? `“${p.label}”` : '';
  }
}

export function buildReport({ source, edl, validation, captions, previewExists = () => false, stripExists = () => false }) {
  const kept = editedDuration(edl.cuts, source.duration);
  const removed = source.duration - kept;
  const L = [];
  L.push(`# Edit report: ${edl.video || path.basename(source.path)}`, '');
  L.push(`**${formatTime(source.duration)} → ${formatTime(kept)}** (${removed.toFixed(1)}s removed) · ${edl.cues.length} visual edit(s) · ${edl.cuts.length} cut(s) · ${edl.rejected.length} candidate(s) rejected`, '');
  if (edl.cues.length) {
    const p = pacing(edl, source.duration);
    L.push(`**Pacing:** ${p.perMinute.toFixed(1)} visual edits per minute · something on screen ${Math.round(p.coveredShare * 100)}% of the time · longest stretch with nothing: ${p.longestGap.seconds.toFixed(0)}s (${formatTime(p.longestGap.start)}–${formatTime(p.longestGap.end)}, edited time)`, '');
  }

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
    const previews = [...edl.cues].sort((a, b) => a.start - b.start).filter((c) => previewExists(c.id));
    if (previews.length) {
      L.push('### Previews', '');
      for (const c of previews) {
        L.push(`**${c.id}** · ${c.template} · ${formatTime(mapTime(c.start, edl.cuts))}`, '', `![${c.id}](preview/${c.id}.gif)`, '');
        if (stripExists(c.id)) L.push(`Landed · last reveal · one second before exit:`, '', `![${c.id} moments](preview/${c.id}.strip.jpg)`, '');
      }
    }
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

  L.push('## Captions', '');
  if (captions?.burned) L.push(`✓ ${captions.count} captions burned into the video, timed to the edit. Sidecar files for YouTube and players: ${captions.files.map((f) => `\`${f}\``).join(', ')}.`, '');
  else if (captions?.files?.length) L.push(`Not burned in (\`captions.burn: false\`). Sidecar files: ${captions.files.map((f) => `\`${f}\``).join(', ')}.`, '');
  else if (captions) L.push('_No captions: the transcript has no words._', '');
  else L.push('_Not built yet._', '');

  L.push('## Considered and not suggested', '', 'Ideas that were looked at and left out, with the reason.', '');
  if (!edl.rejected.length) L.push('_None._', '');
  else {
    L.push('| id | kind | idea | rejected by |', '|---|---|---|---|');
    for (const r of edl.rejected) L.push(`| ${r.id || ''} | ${r.kind || ''} | ${cell(r.summary)} | ${cell(r.rule)} |`);
    L.push('');
  }

  const errors = (validation?.errors || []).map((e) => `✗ ${e.id} [${e.rule}] ${e.message}`);
  if (errors.length) {
    L.push('## Problems to fix before rendering', '');
    errors.forEach((e) => L.push(`- ${e}`));
    L.push('');
  }
  const warnings = (validation?.warnings || []).map((w) => `${w.id} [${w.rule}] ${w.message}`);
  if (warnings.length) {
    L.push('## Warnings', '');
    warnings.forEach((w) => L.push(`- ${w}`));
    L.push('');
  }

  L.push('## Giving notes', '');
  L.push('Reply with notes by id, for example:', '');
  L.push('- `drop cue-3`: remove an edit', '- `restore cut-1`: put removed footage back', '- `cue-2 is too early`: adjust timing', '- `cue-4 should say "…"`: change the wording', '');
  return L.join('\n');
}

export function writeReport(outDir, { log = console.log } = {}) {
  const report = buildReport({
    source: readJson(path.join(outDir, 'source.json')),
    edl: normalizeEdl(readYaml(path.join(outDir, 'edits.yaml')), loadRules().timing.lead_seconds),
    validation: readJson(path.join(outDir, 'validation.json'), null),
    captions: readJson(path.join(outDir, 'captions.json'), null),
    previewExists: (id) => fs.existsSync(path.join(outDir, 'preview', `${id}.gif`)),
    stripExists: (id) => fs.existsSync(path.join(outDir, 'preview', `${id}.strip.jpg`)),
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
