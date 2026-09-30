import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../scripts/report.mjs';
import { computeMetrics } from '../scripts/metrics.mjs';
import { normalizeEdl } from '../lib/edl.js';
import { readYaml } from '../lib/files.js';
import { ROOT } from '../lib/paths.js';
import path from 'node:path';

const demoEdits = readYaml(path.join(ROOT, 'examples/demo/edits.yaml'));

test('report lists objectives, every edit, every rejection and how to give notes', () => {
  const report = buildReport({
    source: { path: 'demo.mp4', duration: 23 },
    edl: normalizeEdl(demoEdits),
    validation: { errors: [], warnings: [] },
    check: { issues: [], findings: [] },
  });
  assert.match(report, /00:23\.0 → 00:21\.0/);
  assert.match(report, /Find where the cache TTL is configured/);
  assert.match(report, /\| cue-2 \| 00:14\.3 \| 00:16\.3 \| flow-diagram \| Client → Edge → Origin/);
  assert.match(report, /\| cut-1 \| 00:05\.0–00:07\.0 \| 2\.0s \| dead-air/);
  assert.match(report, /cand-5 \| cut \|/);
  assert.match(report, /restore cut-1/);
});

test('a low-accuracy transcript is flagged at the top of the report', () => {
  const report = buildReport({ source: { path: 'x.mp4', duration: 10 }, edl: normalizeEdl({ objectives: ['a'] }), transcript: { engine_note: 'PocketSphinx fallback.' } });
  assert.match(report.split('\n').slice(0, 4).join('\n'), /Transcript quality:\*\* PocketSphinx fallback\./);
});

test('a video with no edits says so plainly', () => {
  const report = buildReport({ source: { path: 'x.mp4', duration: 10 }, edl: normalizeEdl({ objectives: ['a'] }) });
  assert.match(report, /None\. The video already teaches clearly/);
  assert.match(report, /has not been checked yet/);
});

test('metrics: precision over reviewed edits, restored cuts tracked separately', () => {
  const m = computeMetrics([
    {
      edits: demoEdits,
      review: {
        decisions: [
          { id: 'cue-1', decision: 'keep' },
          { id: 'cue-2', decision: 'adjust' },
          { id: 'cut-1', decision: 'restore' },
        ],
      },
    },
  ]);
  assert.equal(m.reviewed_edits, 3);
  assert.equal(m.precision, 2 / 3);
  assert.equal(m.restored_cuts, 1);
  assert.deepEqual(m.by_template.zoom, { total: 1, kept: 1 });
});
