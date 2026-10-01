// Renders every overlay template in headless Chromium and checks what a viewer would see:
// nothing at the start, a clear overlay mid-cue, nothing after the exit, readable type, and
// no text in the caption zone or off the frame.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES } from '../lib/templates.js';
import { startServer, launchBrowser, openStage } from '../lib/stage.js';
import { designSpace } from '../lib/design.js';
import { rules, hasBrowser, hasFfmpeg, opaquePixels } from './helpers.mjs';

const SAMPLES = {
  callout: { params: { text: 'Cache TTL' }, anchor: { x: 1300, y: 420 } },
  'highlight-region': { params: { region: { x: 200, y: 300, w: 700, h: 80 }, label: 'Route handler' } },
  'code-focus': { params: { region: { x: 200, y: 300, w: 700, h: 120 }, label: 'The retry loop' } },
  'term-definition': { params: { term: 'TTL', gloss: 'How long a cached response is reused' } },
  'step-list': { params: { title: 'Deploy', steps: ['Build', { text: 'Upload', at: 11.2 }, 'Verify'] } },
  'flow-diagram': { params: { nodes: ['Client', { label: 'Edge', at: 10.9 }, 'Origin'], trace: true } },
  comparison: { params: { left: { title: 'Before', items: ['3 round trips'] }, right: { title: 'After', items: ['1 round trip'], at: 11.0 } } },
  slide: { params: { title: 'Validity Transactions', columns: [
    { heading: 'Sign & send', pill: 'Swap 1 ETH → USDC', lines: ['Signed with conditions', { mono: 'POOL PRICE ≥ 4,000' }] },
    { heading: 'Wait', lines: ['Sequencer checks the conditions'], at: 11.2, note: 'No polling. No resending.' },
    { heading: 'Included', pill: 'INCLUDED', lines: ['Only while valid'], at: 12.4 },
  ] } },
};

const skip = !hasBrowser || !hasFfmpeg ? 'needs Playwright Chromium and ffmpeg' : false;
let server, browser;

before(async () => {
  if (skip) return;
  ({ server } = await startServer());
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
  server?.close();
});

test('every overlay template has a sample here', () => {
  const overlays = Object.entries(TEMPLATES).filter(([, t]) => t.renderer === 'overlay').map(([n]) => n);
  assert.deepEqual(Object.keys(SAMPLES).sort(), overlays.sort());
});

for (const [format, [w, h]] of Object.entries({ landscape: [1280, 720], vertical: [1080, 1920] })) {
  for (const [name, sample] of Object.entries(SAMPLES)) {
    test(`${name} renders cleanly (${format})`, { skip }, async () => {
      const design = designSpace(w, h);
      const { page, errors } = await openStage(browser, `http://127.0.0.1:${server.address().port}`, design, design.scale);
      try {
        const anchor = sample.anchor && format === 'vertical' ? { x: 700, y: 900 } : sample.anchor;
        const params = format === 'vertical' && sample.params.region
          ? { ...sample.params, region: { x: 80, y: 600, w: 700, h: 100 } }
          : sample.params;
        const duration = 4;
        await page.evaluate((spec) => window.stage.load(spec), {
          template: name, params, anchor, duration, cueStart: 10, design, layout: rules.layout,
        });
        const shot = async (ms) => {
          await page.evaluate((t) => window.stage.seek(t), ms);
          return opaquePixels(await page.screenshot({ omitBackground: true }));
        };
        const total = w * h;
        const start = await shot(0);
        const middle = await shot(duration * 1000 * 0.75);
        const issues = await page.evaluate(() => window.stage.layoutIssues());
        const minFont = await page.evaluate(() => window.stage.minFontPx());
        const end = await shot(duration * 1000);

        assert.deepEqual(errors, [], 'no page errors');
        assert.ok(start < total * 0.005, `nearly empty at the start (${start} px)`);
        assert.ok(middle > total * 0.005, `visible mid-cue (${middle} px)`);
        assert.equal(end, 0, 'gone after the exit');
        assert.deepEqual(issues, [], 'text stays in frame and out of the caption zone');
        if (Number.isFinite(minFont)) assert.ok(minFont >= rules.layout.min_font_px, `min font ${minFont}px`);
      } finally {
        await page.close();
      }
    });
  }
}

test('reveals follow their timecodes', { skip }, async () => {
  const design = designSpace(1920, 1080);
  const { page } = await openStage(browser, `http://127.0.0.1:${server.address().port}`, design, 1);
  await page.evaluate((spec) => window.stage.load(spec), {
    template: 'step-list',
    params: { steps: ['One', { text: 'Two', at: 12.0 }] },
    duration: 5, cueStart: 10, design, layout: rules.layout,
  });
  const opacityOfStep2 = (ms) => page.evaluate((t) => {
    window.stage.seek(t);
    return Number(getComputedStyle(document.querySelectorAll('.step')[1]).opacity);
  }, ms);
  assert.equal(await opacityOfStep2(1900), 0, 'step 2 hidden before its word at 12.0s');
  assert.equal(await opacityOfStep2(2600), 1, 'step 2 fully in 600ms after its word');
  await page.close();
});

test('labels never cover the thing they describe', { skip }, async () => {
  const design = designSpace(1920, 1080);
  const { page } = await openStage(browser, `http://127.0.0.1:${server.address().port}`, design, 1);
  const labelBox = () => page.evaluate(() => {
    window.stage.seek(3500);
    const r = document.querySelector('[data-box$="label"]').getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });
  const load = (template, extra) => page.evaluate((spec) => window.stage.load(spec), {
    template, duration: 5, cueStart: 0, design, layout: rules.layout, ...extra,
  });

  // Callouts: the label stays off the anchor's row, wherever the anchor is.
  for (const anchor of [{ x: 300, y: 500 }, { x: 980, y: 330 }, { x: 1800, y: 100 }, { x: 900, y: 880 }]) {
    await load('callout', { params: { text: 'Cache TTL' }, anchor });
    const box = await labelBox();
    assert.ok(anchor.y < box.top - 20 || anchor.y > box.bottom + 20, `label covers the anchor row at ${JSON.stringify(anchor)}`);
  }

  // Region labels: never overlap the region, even when it's near the frame edges.
  for (const region of [{ x: 160, y: 300, w: 820, h: 66 }, { x: 100, y: 40, w: 1700, h: 80 }, { x: 1000, y: 700, w: 850, h: 100 }]) {
    for (const template of ['highlight-region', 'code-focus']) {
      await load(template, { params: { region, label: 'Retry loop' } });
      const b = await labelBox();
      const overlaps = b.left < region.x + region.w && b.right > region.x && b.top < region.y + region.h && b.bottom > region.y;
      assert.ok(!overlaps, `${template} label overlaps its region ${JSON.stringify(region)}`);
    }
  }
  await page.close();
});

test('boxes in one diagram are the same size', { skip }, async () => {
  const design = designSpace(1920, 1080);
  const { page } = await openStage(browser, `http://127.0.0.1:${server.address().port}`, design, 1);
  const sizes = (sel) => page.evaluate((q) => [...document.querySelectorAll(q)].map((n) => { const r = n.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }), sel);
  const load = (template, params) => page.evaluate((spec) => window.stage.load(spec), { template, params, duration: 5, cueStart: 0, design, layout: rules.layout });

  await load('flow-diagram', { nodes: ['Go', 'A much longer node label', 'Mid'] });
  let s = await sizes('.node');
  assert.ok(s.every(([w, h]) => w === s[0][0] && h === s[0][1]), `flow nodes differ: ${JSON.stringify(s)}`);

  await load('slide', { title: 'T', columns: [{ heading: 'A', pill: 'P', lines: ['one', 'two', 'three lines here'] }, { heading: 'B', lines: ['x'] }, { heading: 'C', pill: 'Q' }] });
  s = await sizes('.slide-col .card');
  assert.ok(s.every(([, h]) => h === s[0][1]), `slide cards differ in height: ${JSON.stringify(s)}`);

  await load('comparison', { left: { title: 'Short', items: ['a'] }, right: { title: 'A considerably longer title', items: ['b', 'c'] } });
  s = await sizes('.compare .column');
  assert.ok(s.every(([w, h]) => w === s[0][0] && h === s[0][1]), `comparison columns differ: ${JSON.stringify(s)}`);
  await page.close();
});
