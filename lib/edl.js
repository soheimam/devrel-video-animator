// The edit decision list (edits.yaml): every cut and cue for one video, always in
// source-video time, so each edit is independent and reversible.
import { parseTime, formatTime } from './time.js';
import { TEMPLATES, GAPS, wordCount, words } from './templates.js';
import { designSpace } from './design.js';

export const CUT_KINDS = ['dead-air', 'false-start', 'filler', 'wait'];

function safeTime(value) {
  try {
    return parseTime(value);
  } catch {
    return NaN;
  }
}

// lead: seconds each cue starts before its 'at' time (rules.timing.lead_seconds).
export function normalizeEdl(raw, lead = 0) {
  const edl = raw || {};
  return {
    video: edl.video,
    objectives: edl.objectives || [],
    cuts: (edl.cuts || []).map((c) => ({ ...c, start: safeTime(c.from), end: safeTime(c.to) })),
    cues: (edl.cues || []).map((c) => {
      const at = safeTime(c.at);
      const start = Math.max(0, at - lead);
      return { ...c, params: c.params || {}, at_seconds: at, start, end: start + safeTime(c.duration) };
    }),
    rejected: edl.rejected || [],
    captions: edl.captions || {},
  };
}

// Captions are burned in unless the edit list opts out.
export function captionsBurned(edl, rules) {
  return edl.captions?.burn ?? rules.captions?.burn_by_default ?? false;
}

export function overlayCues(edl) {
  return edl.cues.filter((c) => TEMPLATES[c.template]?.renderer === 'overlay');
}

export function zoomCues(edl) {
  return edl.cues.filter((c) => c.template === 'zoom');
}

export function sortedCuts(cuts) {
  return [...cuts].sort((a, b) => a.start - b.start);
}

// Source ranges that survive the cuts.
export function keptRanges(cuts, duration) {
  const ranges = [];
  let pos = 0;
  for (const cut of sortedCuts(cuts)) {
    if (cut.start > pos) ranges.push([pos, cut.start]);
    pos = Math.max(pos, cut.end);
  }
  if (pos < duration) ranges.push([pos, duration]);
  return ranges;
}

// Where a source-time moment lands in the edited video.
export function mapTime(t, cuts) {
  let removed = 0;
  for (const cut of sortedCuts(cuts)) {
    if (t >= cut.end) removed += cut.end - cut.start;
    else if (t > cut.start) removed += t - cut.start;
  }
  return t - removed;
}

export function editedDuration(cuts, duration) {
  return keptRanges(cuts, duration).reduce((sum, [a, b]) => sum + (b - a), 0);
}

export function readingSeconds(text, rules) {
  return rules.reading.base_seconds + wordCount(text) * rules.reading.seconds_per_word;
}

// How far a zoom cue punches in, from its region and the frame size (design pixels).
export function zoomFactor(region, frame, rules) {
  const pad = 1 + rules.zoom.padding;
  const factor = Math.min(frame.w / (region.w * pad), frame.h / (region.h * pad));
  return Math.max(1, Math.min(factor, rules.zoom.max_factor));
}

const NUMBER = /\d+(?:[.,]\d+)*/g;
const numbersIn = (text) => (String(text).match(NUMBER) || []).map((n) => n.replace(/,/g, ''));

function inFrame(box, frame) {
  return box.x >= 0 && box.y >= 0 && box.x + (box.w || 0) <= frame.w && box.y + (box.h || 0) <= frame.h;
}

/**
 * Mechanical checks that keep a render from being broken or unreadable. Whether an edit is
 * a good idea is for the human reviewing the suggestions.
 *
 * ctx: { rules, video: {width, height, duration}, transcriptText }
 */
export function validateEdl(rawEdl, ctx) {
  const { rules } = ctx;
  const edl = normalizeEdl(rawEdl, rules.timing?.lead_seconds || 0);
  const errors = [];
  const warnings = [];
  const err = (id, rule, message) => errors.push({ id, rule, message });
  const warn = (id, rule, message) => warnings.push({ id, rule, message });
  const frame = ctx.video ? designSpace(ctx.video.width, ctx.video.height) : null;
  const duration = ctx.video?.duration ?? Infinity;
  const captionTop = frame ? frame.h * (1 - rules.layout.caption_zone) : Infinity;

  if (!Array.isArray(edl.objectives) || edl.objectives.length === 0) {
    err('edits', 'objectives', 'List the video\'s learning objectives (from the content map).');
  } else {
    edl.objectives.forEach((o, i) => {
      if (typeof o !== 'string') {
        err('edits', 'schema', `Objective ${i + 1} is not plain text. In YAML, quote any line containing ": " (e.g. - "Know what X is: a …").`);
      }
    });
  }

  const seen = new Set();
  for (const item of [...edl.cuts, ...edl.cues]) {
    if (!item.id) err('?', 'schema', 'Every cut and cue needs an id.');
    else if (seen.has(item.id)) err(item.id, 'schema', `Duplicate id "${item.id}".`);
    seen.add(item.id);
  }

  // Cuts
  const cuts = sortedCuts(edl.cuts);
  for (const cut of cuts) {
    if (Number.isNaN(cut.start) || Number.isNaN(cut.end)) {
      err(cut.id, 'schema', 'Cut needs valid "from" and "to" times.');
      continue;
    }
    if (cut.end <= cut.start) err(cut.id, 'schema', '"to" must be after "from".');
    if (cut.end > duration + 0.05) err(cut.id, 'schema', 'Cut ends after the video does.');
    const len = cut.end - cut.start;
    if (len < rules.cuts.min_seconds) {
      err(cut.id, 'cut-length', `Cut is ${len.toFixed(2)}s; below ${rules.cuts.min_seconds}s it only causes a jump.`);
    }
    if (!cut.reason) err(cut.id, 'explain', 'Every cut needs a reason.');
    if (cut.kind && !CUT_KINDS.includes(cut.kind)) {
      err(cut.id, 'schema', `Unknown cut kind "${cut.kind}". Use one of: ${CUT_KINDS.join(', ')}.`);
    }
  }
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i].start < cuts[i - 1].end) err(cuts[i].id, 'schema', `Overlaps ${cuts[i - 1].id}.`);
  }

  // Cues
  const cues = [...edl.cues].sort((a, b) => a.start - b.start);
  for (const cue of cues) {
    const id = cue.id;
    const tpl = TEMPLATES[cue.template];
    if (!tpl) {
      err(id, 'schema', `Unknown template "${cue.template}". Use one of: ${Object.keys(TEMPLATES).join(', ')}.`);
      continue;
    }
    if (Number.isNaN(cue.start) || Number.isNaN(cue.end)) {
      err(id, 'schema', 'Cue needs valid "at" and "duration".');
      continue;
    }
    for (const key of tpl.required) {
      if (cue.params[key] === undefined || cue.params[key] === '') {
        err(id, 'schema', `${cue.template} needs params.${key}.`);
      }
    }
    if (!GAPS.includes(cue.gap)) {
      err(id, 'gap-test', `Name the gap this cue closes: one of ${GAPS.join(', ')}.`);
    } else if (!tpl.gaps.includes(cue.gap)) {
      err(id, 'gap-test', `${cue.template} does not close a "${cue.gap}" gap. It fits: ${tpl.gaps.join(', ')}.`);
    }
    if (!Number.isInteger(cue.objective) || cue.objective < 1 || cue.objective > edl.objectives.length) {
      err(id, 'objective', 'Point "objective" at the learning objective (1-based) this cue serves.');
    }
    if (!cue.rationale) err(id, 'explain', 'Every cue needs a rationale.');

    const len = cue.end - cue.start;
    if (cue.end > duration + 0.05) err(id, 'schema', 'Cue runs past the end of the video.');
    if (cue.template === 'zoom') {
      if (len < rules.zoom.min_duration_seconds) {
        err(id, 'timing', `Zooms need at least ${rules.zoom.min_duration_seconds}s or they feel like a jolt.`);
      }
    } else if (len < rules.cues.min_duration_seconds) {
      err(id, 'timing', `Cue is ${len.toFixed(1)}s; minimum is ${rules.cues.min_duration_seconds}s.`);
    }
    if (len > rules.cues.max_duration_seconds) {
      warn(id, 'timing', `Cue stays up ${len.toFixed(1)}s. Is it still helping, or is it clutter by now?`);
    }

    const text = tpl.text(cue.params);
    const needed = readingSeconds(text, rules);
    if (text && len < needed) {
      err(id, 'reading-time', `${wordCount(text)} words need ${needed.toFixed(1)}s on screen; cue lasts ${len.toFixed(1)}s.`);
    }

    // Progressive reveals must happen inside the cue, early enough to be read before it exits
    // (a reveal that lands as the cue leaves is the most common way a good cue looks rushed).
    const reveals = [
      ...(cue.params.steps || []),
      ...(cue.params.nodes || []),
      ...(cue.params.columns || []),
      cue.params.right,
    ].filter((r) => r && typeof r === 'object' && r.at !== undefined);
    const lastReveal = Math.max(...reveals.map((r) => safeTime(r.at)), -Infinity);
    for (const r of reveals) {
      const t = safeTime(r.at) - (rules.timing?.lead_seconds || 0);
      const own = readingSeconds(words(r.text, r.label, r.heading, r.pill, r.lines, r.items, r.title), rules);
      // A slide's takeaway lands about 1.3s after its last column and needs reading too.
      const after = cue.template === 'slide' && cue.params.summary && safeTime(r.at) === lastReveal
        ? 1.3 + readingSeconds(cue.params.summary, rules)
        : own;
      if (Number.isNaN(t) || t < cue.start) {
        err(id, 'timing', `Reveal at ${r.at} falls before the cue starts.`);
      } else if (t > cue.end - after) {
        err(id, 'timing', `Reveal at ${r.at} lands ${(cue.end - t).toFixed(1)}s before the cue ends; it needs ${after.toFixed(1)}s to be read. Extend the cue or move the reveal.`);
      }
    }

    if (frame) {
      if (tpl.placement === 'anchor' && !cue.anchor) {
        err(id, 'placement', `${cue.template} must be anchored to the element it describes (anchor: {x, y}).`);
      }
      if (cue.anchor) {
        if (!inFrame(cue.anchor, frame)) err(id, 'placement', 'Anchor is outside the frame.');
        else if (cue.anchor.y >= captionTop) {
          err(id, 'caption-zone', `Anchor y=${cue.anchor.y} is in the caption zone (y ≥ ${Math.round(captionTop)}).`);
        }
      }
      const region = cue.params.region;
      if (region) {
        if (!(region.w > 0 && region.h > 0)) err(id, 'placement', 'Region needs a positive w and h.');
        else if (!inFrame(region, frame)) err(id, 'placement', 'Region is outside the frame.');
        else if (cue.template === 'zoom' && zoomFactor(region, frame, rules) < 1.15) {
          warn(id, 'zoom', 'Region is nearly the whole frame; this zoom barely changes anything.');
        }
      }
    }

    for (const cut of cuts) {
      if (cut.start < cue.end && cut.end > cue.start) {
        err(id, 'spans-cut', `Cue overlaps ${cut.id} (${formatTime(cut.start)}–${formatTime(cut.end)}).`);
      }
    }

    // Accuracy: overlays never introduce numbers the narration didn't contain.
    const sourceNumbers = new Set(numbersIn(ctx.transcriptText || ''));
    // Numbers quoted from the screen (source: screen) are checked by the suggester, not here.
    for (const n of ctx.transcriptText && cue.source !== 'screen' ? numbersIn(text) : []) {
      if (!sourceNumbers.has(n)) {
        err(id, 'nothing-new', `"${n}" is on screen but was never said or shown in the video.`);
      }
    }
  }

  // One focus at a time.
  const valid = cues.filter((c) => TEMPLATES[c.template] && !Number.isNaN(c.end));
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const cur = valid[i];
    if (cur.start < prev.end) {
      err(cur.id, 'one-focus', `Overlaps ${prev.id}. Only one thing should ask for attention at a time.`);
    }
  }

  if (captionsBurned(edl, rules) && ctx.transcriptText !== undefined && !ctx.transcriptText.trim()) {
      warn('captions', 'captions', 'No transcript words, so there are no captions to burn in.');
  }
  const avoid = edl.captions?.avoid;
  if (avoid && frame && !(avoid.w > 0 && avoid.h > 0 && inFrame(avoid, frame))) {
    err('captions', 'placement', 'captions.avoid must be a box inside the frame.');
  }

  for (const r of edl.rejected) {
    if (!r.rule || !r.summary) warn(r.id || '?', 'explain', 'Rejected candidates need a summary and the rule that rejected them.');
  }

  return { errors, warnings };
}
