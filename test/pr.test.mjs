import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { findAttachment, pickVideoFile, nameFor } from '../scripts/pr-recording.mjs';
import { assetName, assetUrl, buildComment, MARKER } from '../scripts/publish.mjs';
import { normalizeEdl } from '../lib/edl.js';

describe('finding the recording on a PR', () => {
  test('a dragged-in video becomes a user-attachments URL', () => {
    const body = 'Here it is\n\nhttps://github.com/user-attachments/assets/0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b\n\nAudience: app devs';
    assert.equal(findAttachment(body), 'https://github.com/user-attachments/assets/0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b');
  });
  test('a plain link to an mp4 also counts, other links do not', () => {
    assert.equal(findAttachment('see https://cdn.example.com/talks/edge.mp4 please'), 'https://cdn.example.com/talks/edge.mp4');
    assert.equal(findAttachment('see https://example.com/page and nothing else'), null);
  });
  test('a video added under videos/ wins over the body', () => {
    assert.equal(pickVideoFile([{ path: 'README.md' }, { path: 'videos/Edge Caching.mp4' }]), 'videos/Edge Caching.mp4');
    assert.equal(pickVideoFile([{ path: 'videos/notes.md' }]), null);
  });
  test('the name comes from the file, else the attachment name, else the title', () => {
    assert.equal(nameFor({ file: 'videos/Edge Caching.mp4' }), 'edge-caching');
    assert.equal(nameFor({ title: 'x', body: '[edge-caching-intro.mp4](https://github.com/user-attachments/assets/abc)' }), 'edge-caching-intro');
    assert.equal(nameFor({ title: 'Vibenet walkthrough', body: 'https://github.com/user-attachments/assets/abc' }), 'vibenet-walkthrough');
  });
});

describe('publishing', () => {
  test('assets are prefixed with the video name so one release holds many videos', () => {
    assert.equal(assetName('edge', 'out/edge/preview/beat-1.gif'), 'edge--beat-1.gif');
    assert.equal(assetUrl('o/r', 'renders', 'edge', 'edited.mp4'), 'https://github.com/o/r/releases/download/renders/edge--edited.mp4');
  });
  test('the review comment carries a marker, the download link, every beat and the picks instructions', () => {
    const edl = normalizeEdl({
      cues: [{ id: 'beat-1', at: 10, duration: '4s', template: 'term-definition', params: { term: 'Hard fork', gloss: 'Changes the chain' }, rationale: 'Said once.' }],
      cuts: [{ id: 'cut-1', from: 0, to: 0.5, reason: 'lead-in' }],
      rejected: [{ summary: 'A zoom', rule: 'already large' }],
    }, 0.25);
    const c = buildComment({ name: 'edge', repo: 'o/r', tag: 'renders', edl, source: { duration: 120 }, prNumber: 7, round: 2 });
    assert.ok(c.startsWith(MARKER('edge')));
    assert.match(c, /Download edited\.mp4\]\(https:\/\/github\.com\/o\/r\/releases\/download\/renders\/edge--edited\.mp4\)/);
    assert.match(c, /- \[ \] \*\*beat-1 · term-definition\*\*/);
    assert.match(c, /edge--beat-1\.strip\.jpg/);
    assert.match(c, /- \[ \] \*\*cut-1\*\*/);
    assert.match(c, /@claude drop beat-3/);
    assert.match(c, /round 2/);
  });
});
