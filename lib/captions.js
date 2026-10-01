// Closed captions from the word-level transcript, on the edited timeline: words inside cuts
// are dropped and the rest shifted by mapTime. Output as SRT and WebVTT (sidecar files for
// YouTube and players) and ASS (burned into the video by ffmpeg/libass).
import { mapTime } from './edl.js';
import { designSpace } from './design.js';

// Balanced line wrap: the split point that makes the lines most even.
export function wrap(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const worst = Math.max(a.length, b.length);
    if (!best || worst < best.worst) best = { worst, lines: [a, b] };
  }
  return best ? best.lines : [text];
}

export function captionCues(transcript, cuts = [], opts = {}) {
  const {
    max_chars_per_line: maxChars = 42,
    max_lines: maxLines = 2,
    max_seconds: maxSeconds = 6,
    min_seconds: minSeconds = 1,
    break_on_pause_seconds: pauseBreak = 0.8,
  } = opts;
  const inCut = (w) => cuts.some((c) => (w.start + w.end) / 2 >= c.start && (w.start + w.end) / 2 < c.end);
  const words = (transcript.segments || [])
    .flatMap((s) => s.words || [])
    .filter((w) => !inCut(w))
    .map((w) => ({ word: w.word, start: mapTime(w.start, cuts), end: mapTime(w.end, cuts) }));

  const cues = [];
  let cur = [];
  const text = (ws) => ws.map((w) => w.word).join(' ');
  const flush = () => {
    if (cur.length) cues.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: text(cur) });
    cur = [];
  };
  for (const w of words) {
    if (cur.length) {
      const prev = cur[cur.length - 1];
      const lines = wrap(text([...cur, w]), maxChars);
      const tooLong = lines.length > maxLines || lines.some((l) => l.length > maxChars);
      const tooSlow = w.end - cur[0].start > maxSeconds;
      const pause = w.start - prev.end > pauseBreak;
      const sentenceDone = /[.?!]$/.test(prev.word) && text(cur).length > maxChars / 2;
      if (tooLong || tooSlow || pause || sentenceDone) flush();
    }
    cur.push(w);
  }
  flush();

  // Give short captions time to be read, without overlapping the next one.
  cues.forEach((c, i) => {
    const next = cues[i + 1];
    const limit = next ? next.start - 0.05 : c.end + minSeconds;
    if (c.end - c.start < minSeconds) c.end = Math.max(c.end, Math.min(c.start + minSeconds, limit));
    c.lines = wrap(c.text, maxChars);
  });
  return cues;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
function stamp(t, sep) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}

export function toSRT(cues) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.lines.join('\n')}\n`).join('\n');
}

export function toVTT(cues) {
  return `WEBVTT\n\n${cues.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.lines.join('\n')}\n`).join('\n')}`;
}

// Horizontal margins (design px) that keep captions clear of a region in the caption band,
// e.g. a webcam bubble in the bottom corner. Captions centre in the space that is left.
export function captionMargins(frame, rules, avoid) {
  const base = rules.layout.margin;
  const bandTop = frame.h * (1 - rules.layout.caption_zone);
  let left = base;
  let right = base;
  if (avoid && avoid.y + avoid.h > bandTop) {
    if (avoid.x + avoid.w / 2 > frame.w / 2) right = Math.max(right, frame.w - avoid.x + base);
    else left = Math.max(left, avoid.x + avoid.w + base);
  }
  return { left, right };
}

const assTime = (t) => {
  const cs = Math.round(t * 100);
  return `${Math.floor(cs / 360000)}:${pad(Math.floor((cs % 360000) / 6000))}:${pad(Math.floor((cs % 6000) / 100))}.${pad(cs % 100)}`;
};

export function toASS(cues, { width, height, rules, avoid }) {
  const frame = designSpace(width, height);
  const px = (d) => Math.round(d * frame.scale);
  const { left, right } = captionMargins(frame, rules, avoid);
  const c = rules.captions;
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/[{}]/g, '');
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // BorderStyle 3 draws an opaque box behind the text (OutlineColour, ~80% opaque).
    `Style: Caption,${c.font},${px(c.font_px)},&H00FFFFFF,&H00FFFFFF,&H33000000,&H00000000,0,0,0,0,100,100,0,0,3,${px(12)},0,2,${px(left)},${px(right)},${px(rules.layout.margin)},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...cues.map((q) => `Dialogue: 0,${assTime(q.start)},${assTime(q.end)},Caption,,0,0,0,,${q.lines.map(esc).join('\\N')}`),
    '',
  ].join('\n');
}
