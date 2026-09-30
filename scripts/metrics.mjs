#!/usr/bin/env node
// Quality metrics from human reviews. Each reviewed video has out/<video>/review.yaml:
//
//   reviewer: sam
//   decisions:
//     - { id: cue-1, decision: keep }
//     - { id: cue-2, decision: drop, note: "Screen already shows this" }
//     - { id: cut-1, decision: restore, note: "Removed the install command" }
//
// decision: keep | adjust | drop (cues and cuts) or restore (cuts put back).
// Precision = share of the agents' edits the reviewer kept (keep + adjust).
// Restored cuts are the most serious miss: useful content was removed.
//
// Usage: node scripts/metrics.mjs [out]
import fs from 'node:fs';
import path from 'node:path';
import { readYaml } from '../lib/files.js';
import { ROOT } from '../lib/paths.js';
import { isMain } from '../lib/cli.js';

export function computeMetrics(videos) {
  const byTemplate = {};
  let total = 0, kept = 0, restored = 0, cuts = 0;
  for (const { edits, review } of videos) {
    const decisions = new Map((review.decisions || []).map((d) => [d.id, d]));
    const items = [
      ...(edits.cues || []).map((c) => ({ id: c.id, group: c.template })),
      ...(edits.cuts || []).map((c) => ({ id: c.id, group: 'cut' })),
    ];
    for (const item of items) {
      const d = decisions.get(item.id);
      if (!d) continue;
      const ok = d.decision === 'keep' || d.decision === 'adjust';
      total++;
      if (ok) kept++;
      if (item.group === 'cut') {
        cuts++;
        if (d.decision === 'restore') restored++;
      }
      byTemplate[item.group] ??= { total: 0, kept: 0 };
      byTemplate[item.group].total++;
      if (ok) byTemplate[item.group].kept++;
    }
  }
  return {
    videos: videos.length,
    reviewed_edits: total,
    precision: total ? kept / total : null,
    cuts_reviewed: cuts,
    restored_cuts: restored,
    by_template: byTemplate,
  };
}

export function loadReviewed(outRoot) {
  if (!fs.existsSync(outRoot)) return [];
  return fs
    .readdirSync(outRoot)
    .map((d) => path.join(outRoot, d))
    .filter((d) => fs.existsSync(path.join(d, 'review.yaml')) && fs.existsSync(path.join(d, 'edits.yaml')))
    .map((d) => ({ dir: d, edits: readYaml(path.join(d, 'edits.yaml')), review: readYaml(path.join(d, 'review.yaml')) }));
}

if (isMain(import.meta.url)) {
  const outRoot = process.argv[2] || path.join(ROOT, 'out');
  const m = computeMetrics(loadReviewed(outRoot));
  if (!m.videos) {
    console.log('No reviewed videos yet (looking for out/*/review.yaml).');
    process.exit(0);
  }
  const pct = (v) => (v === null ? 'n/a' : `${Math.round(v * 100)}%`);
  console.log(`Reviewed videos: ${m.videos}`);
  console.log(`Precision:       ${pct(m.precision)} of ${m.reviewed_edits} edits kept`);
  console.log(`Restored cuts:   ${m.restored_cuts} of ${m.cuts_reviewed} cuts`);
  for (const [t, v] of Object.entries(m.by_template)) console.log(`  ${t.padEnd(18)} ${pct(v.kept / v.total)} (${v.kept}/${v.total})`);
}
