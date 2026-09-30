import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateEdl, normalizeEdl, keptRanges, mapTime, editedDuration, zoomFactor } from '../lib/edl.js';
import { rules, baseEdl, video1080 } from './helpers.mjs';

const transcriptText = 'Every request goes from the client to the edge. We set the TTL to 300 seconds.';
const ctx = (extra = {}) => ({ rules, video: video1080, transcriptText, ocrText: '', glossary: [], ...extra });

const flow = (over = {}) => ({
  id: 'cue-1',
  at: '00:10.0',
  duration: '5s',
  template: 'flow-diagram',
  params: { nodes: ['Client', 'Edge', 'Origin'] },
  gap: 'said-not-shown',
  objective: 1,
  rationale: 'The flow is described but never drawn.',
  ...over,
});

const rulesHit = (result, rule) => result.errors.some((e) => e.rule === rule);
const warned = (result, rule) => result.warnings.some((e) => e.rule === rule);

describe('timeline maths', () => {
  const cuts = normalizeEdl({ cuts: [{ id: 'a', from: 10, to: 12 }, { id: 'b', from: 30, to: 35 }] }).cuts;

  test('keeps everything outside the cuts', () => {
    assert.deepEqual(keptRanges(cuts, 60), [[0, 10], [12, 30], [35, 60]]);
    assert.equal(editedDuration(cuts, 60), 53);
  });

  test('maps source time to edited time', () => {
    assert.equal(mapTime(5, cuts), 5);
    assert.equal(mapTime(11, cuts), 10); // inside a cut: lands on the join
    assert.equal(mapTime(20, cuts), 18);
    assert.equal(mapTime(40, cuts), 33);
  });

  test('zoom factor fits the region with padding and is capped', () => {
    const frame = { w: 1920, h: 1080 };
    assert.ok(Math.abs(zoomFactor({ x: 0, y: 0, w: 960, h: 100 }, frame, rules) - 1920 / (960 * 1.15)) < 1e-9);
    assert.equal(zoomFactor({ x: 0, y: 0, w: 50, h: 20 }, frame, rules), rules.zoom.max_factor);
  });
});

describe('validation: a good edit list', () => {
  test('passes with no errors', () => {
    const result = validateEdl(baseEdl({ cues: [flow()] }), ctx());
    assert.deepEqual(result.errors, []);
  });

  test('"no changes" is a valid edit list', () => {
    assert.deepEqual(validateEdl(baseEdl(), ctx()).errors, []);
  });
});

describe('validation: the gap test and explanations', () => {
  test('every cue names a gap', () => {
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [flow({ gap: undefined })] }), ctx()), 'gap-test'));
  });

  test('the template must fit the gap', () => {
    const cue = flow({ template: 'comparison', params: { left: { title: 'A' }, right: { title: 'B' } } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx()), 'gap-test'));
  });

  test('every cue serves a stated objective', () => {
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [flow({ objective: 2 })] }), ctx()), 'objective'));
    assert.ok(rulesHit(validateEdl(baseEdl({ objectives: [] }), ctx()), 'objectives'));
  });

  test('objectives must be plain text (the YAML ": " trap)', async () => {
    const { default: YAML } = await import('yaml');
    const parsed = YAML.parse('objectives:\n  - Know what Vibenet is: a developer network\n');
    assert.equal(typeof parsed.objectives[0], 'object', 'unquoted ": " really does parse as a map');
    assert.ok(validateEdl(baseEdl({ objectives: parsed.objectives }), ctx()).errors.some((e) => e.rule === 'schema' && /quote/.test(e.message)));
    assert.deepEqual(validateEdl(baseEdl({ objectives: ['Know what Vibenet is: a developer network'] }), ctx()).errors, []);
  });

  test('every cue and cut explains itself', () => {
    const result = validateEdl(
      baseEdl({ cues: [flow({ rationale: '' })], cuts: [{ id: 'cut-1', from: 1, to: 2 }] }),
      ctx(),
    );
    assert.equal(result.errors.filter((e) => e.rule === 'explain').length, 2);
  });

  test('unknown templates and missing params are schema errors', () => {
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [flow({ template: 'confetti' })] }), ctx()), 'schema'));
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [flow({ params: {} })] }), ctx()), 'schema'));
  });
});

describe('validation: timing', () => {
  test('text stays up long enough to read', () => {
    const cue = flow({ duration: '1.6s', params: { nodes: ['Client', 'Edge', 'Origin', 'Database', 'Queue'] } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx()), 'reading-time'));
  });

  test('reveals happen inside the cue', () => {
    const cue = flow({ params: { nodes: ['Client', { label: 'Edge', at: '00:14.5' }] } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx()), 'timing'));
  });

  test('only one thing asks for attention at a time', () => {
    const result = validateEdl(baseEdl({ cues: [flow(), flow({ id: 'cue-2', at: '00:12.0' })] }), ctx());
    assert.ok(rulesHit(result, 'one-focus'));
  });

  test('cues too close together are flagged', () => {
    const result = validateEdl(baseEdl({ cues: [flow(), flow({ id: 'cue-2', at: '00:16.0' })] }), ctx());
    assert.ok(warned(result, 'spacing'));
    assert.ok(!rulesHit(result, 'one-focus'));
  });

  test('density is capped per minute', () => {
    const cues = [0, 1, 2, 3, 4].map((i) => flow({ id: `cue-${i}`, at: 2 + i * 9, duration: '5s' }));
    assert.ok(rulesHit(validateEdl(baseEdl({ cues }), ctx()), 'density'));
  });

  test('a cue may not span a cut', () => {
    const cuts = [{ id: 'cut-1', from: '00:12.0', to: '00:13.0', reason: 'false start' }];
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [flow()], cuts }), ctx()), 'spans-cut'));
  });

  test('zooms need time to settle', () => {
    const zoom = flow({ template: 'zoom', gap: 'shown-not-findable', duration: '1s', params: { region: { x: 100, y: 100, w: 400, h: 100 } } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [zoom] }), ctx()), 'timing'));
  });
});

describe('validation: cuts', () => {
  test('overlapping, tiny or inverted cuts are errors', () => {
    const cuts = [
      { id: 'a', from: 10, to: 12, reason: 'x' },
      { id: 'b', from: 11, to: 14, reason: 'x' },
      { id: 'c', from: 20, to: 20.1, reason: 'x' },
      { id: 'd', from: 30, to: 29, reason: 'x' },
    ];
    const result = validateEdl(baseEdl({ cuts }), ctx());
    assert.ok(result.errors.some((e) => e.id === 'b' && e.rule === 'schema'));
    assert.ok(result.errors.some((e) => e.id === 'c' && e.rule === 'cut-length'));
    assert.ok(result.errors.some((e) => e.id === 'd'));
  });

  test('long cuts are flagged for a second look', () => {
    const result = validateEdl(baseEdl({ cuts: [{ id: 'a', from: 10, to: 40, reason: 'long install' }] }), ctx());
    assert.ok(warned(result, 'cut-length'));
  });
});

describe('validation: placement', () => {
  test('callouts must be anchored', () => {
    const cue = flow({ template: 'callout', gap: 'shown-not-findable', params: { text: 'Edge cache' } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx()), 'placement'));
  });

  test('anchors stay out of the caption zone', () => {
    const cue = flow({ template: 'callout', gap: 'shown-not-findable', params: { text: 'Edge cache' }, anchor: { x: 400, y: 1000 } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx()), 'caption-zone'));
  });

  test('regions must be inside the frame', () => {
    const cue = flow({ template: 'highlight-region', gap: 'shown-not-findable', params: { region: { x: 1800, y: 100, w: 400, h: 100 } } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx()), 'placement'));
  });

  test('vertical video uses a 1080-wide design space', () => {
    const cue = flow({ template: 'callout', gap: 'shown-not-findable', params: { text: 'Edge' }, anchor: { x: 1500, y: 400 } });
    const vertical = { width: 1080, height: 1920, duration: 60 };
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx({ video: vertical })), 'placement'));
  });
});

describe('validation: accuracy', () => {
  test('overlays never introduce numbers the video did not contain', () => {
    const ok = flow({ template: 'callout', gap: 'shown-not-findable', params: { text: 'TTL 300 seconds' }, anchor: { x: 400, y: 300 } });
    const bad = flow({ ...ok, params: { text: 'TTL 600 seconds' } });
    assert.ok(!rulesHit(validateEdl(baseEdl({ cues: [ok] }), ctx()), 'nothing-new'));
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [bad] }), ctx()), 'nothing-new'));
  });

  test('numbers read off the screen count as shown', () => {
    const cue = flow({ template: 'callout', gap: 'shown-not-findable', params: { text: 'Port 8787' }, anchor: { x: 400, y: 300 } });
    assert.ok(!rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx({ ocrText: 'listening on :8787' })), 'nothing-new'));
  });

  test('known mis-hearings of glossary terms are caught', () => {
    const glossary = [{ term: 'kubectl', avoid: ['kube control'] }];
    const cue = flow({ params: { nodes: ['kube control', 'API server'] } });
    assert.ok(rulesHit(validateEdl(baseEdl({ cues: [cue] }), ctx({ glossary })), 'glossary'));
  });
});
