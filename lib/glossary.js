import fs from 'node:fs';
import path from 'node:path';
import { EDITORIAL } from './paths.js';

// Parses editorial/GLOSSARY.md. Each term is a bullet, optionally with known mis-hearings:
//   - kubectl (avoid: kube control, kube cuddle)
export function parseGlossary(markdown) {
  const terms = [];
  for (const line of markdown.split('\n')) {
    const m = /^\s*[-*]\s+`?([^`(]+?)`?\s*(?:\(avoid:\s*([^)]*)\))?\s*$/.exec(line);
    if (!m) continue;
    const term = m[1].trim();
    if (!term) continue;
    const avoid = (m[2] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    terms.push({ term, avoid });
  }
  return terms;
}

export function loadGlossary(file = path.join(EDITORIAL, 'GLOSSARY.md')) {
  if (!fs.existsSync(file)) return [];
  return parseGlossary(fs.readFileSync(file, 'utf8'));
}

// Whisper spells unusual words better when they appear in its initial prompt.
export function whisperPrompt(glossary) {
  if (!glossary.length) return '';
  return `Technical terms used in this video: ${glossary.map((g) => g.term).join(', ')}.`;
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function findMisspellings(text, glossary) {
  const hits = [];
  for (const { term, avoid } of glossary) {
    for (const wrong of avoid) {
      // A variant that differs only in case ("Github") must be matched case-sensitively,
      // or the correct spelling would match too.
      const flags = wrong.toLowerCase() === term.toLowerCase() ? '' : 'i';
      if (new RegExp(`(^|[^\\w])${escape(wrong)}($|[^\\w])`, flags).test(text)) {
        hits.push({ wrong, term });
      }
    }
  }
  return hits;
}

// Fixes known mis-hearings in a transcript, word by word, so the agents (and anything they
// quote on screen) start from correct spellings. Multi-word mis-hearings ("kube control")
// collapse into one word spanning the same time. Returns the corrections made.
export function applyGlossary(transcript, glossary) {
  const corrections = [];
  const bare = (w) => w.replace(/^[^\w]+|[^\w]+$/g, '');
  for (const seg of transcript.segments) {
    const words = seg.words || [];
    let changed = false;
    for (const { term, avoid } of glossary) {
      for (const wrong of avoid) {
        const parts = wrong.split(/\s+/);
        const caseOnly = wrong.toLowerCase() === term.toLowerCase();
        const same = (a, b) => (caseOnly ? a === b : a.toLowerCase() === b.toLowerCase());
        for (let i = 0; i + parts.length <= words.length; i++) {
          if (!parts.every((p, k) => same(bare(words[i + k].word), p))) continue;
          const last = words[i + parts.length - 1];
          const trailing = last.word.match(/[^\w]*$/)[0];
          corrections.push({ at: words[i].start, from: words.slice(i, i + parts.length).map((w) => w.word).join(' '), to: term });
          words.splice(i, parts.length, { word: term + trailing, start: words[i].start, end: last.end });
          changed = true;
        }
      }
    }
    if (changed) seg.text = words.map((w) => w.word).join(' ');
  }
  return corrections;
}
