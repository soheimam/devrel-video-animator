import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, formatTime } from '../lib/time.js';

test('parses every supported timecode form', () => {
  assert.equal(parseTime(12.5), 12.5);
  assert.equal(parseTime('12.5'), 12.5);
  assert.equal(parseTime('4.2s'), 4.2);
  assert.equal(parseTime('300ms'), 0.3);
  assert.equal(parseTime('02:14.3'), 134.3);
  assert.equal(parseTime('1:02:14.3'), 3734.3);
});

test('rejects malformed timecodes', () => {
  for (const bad of ['', 'abc', '1:75', '-3', '1:2:3:4', null, {}]) {
    assert.throws(() => parseTime(bad), /Invalid time/, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test('formats seconds as MM:SS.s, adding hours only when needed', () => {
  assert.equal(formatTime(0), '00:00.0');
  assert.equal(formatTime(134.3), '02:14.3');
  assert.equal(formatTime(3734.34), '1:02:14.3');
  assert.equal(parseTime(formatTime(95.7)), 95.7);
});
