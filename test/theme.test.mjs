import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/paths.js';
import { rules } from './helpers.mjs';

const css = fs.readFileSync(path.join(ROOT, 'templates/theme.css'), 'utf8');
const token = (name) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)[1];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('text colours meet the contrast minimum on cards', () => {
  const card = token('card');
  for (const name of ['ink', 'ink-2', 'blue']) {
    const ratio = contrast(token(name), card);
    assert.ok(ratio >= rules.theme.min_contrast, `--${name} is ${ratio.toFixed(2)}:1 on the card`);
  }
});

test('white text is readable on Base Blue (pills and the slide header)', () => {
  assert.ok(contrast('#ffffff', token('blue')) >= rules.theme.min_contrast);
  assert.equal(token('blue').toLowerCase(), '#0000ff', 'Base Blue is the accent');
});

test('type sizes are at or above the phone-readable minimum', () => {
  for (const name of ['fs-title', 'fs-body', 'fs-label', 'fs-mono']) {
    const px = Number(new RegExp(`--${name}:\\s*(\\d+)px`).exec(css)[1]);
    assert.ok(px >= rules.layout.min_font_px, `--${name} is ${px}px`);
  }
});
