import { formatTime } from './time.js';

// Every transcript is normalised to:
//   { language, segments: [{ start, end, text, words: [{ word, start, end }] }] }
// with times in seconds on the source video's timeline.

// Groups a flat list of timed words into sentence-sized segments: a new segment starts
// after sentence-ending punctuation or a pause longer than a second.
export function groupWords(words) {
  const segments = [];
  let current = [];
  const flush = () => {
    if (!current.length) return;
    segments.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: current.map((w) => w.word).join(' '),
      words: current,
    });
    current = [];
  };
  for (const w of words) {
    const gap = current.length ? w.start - current[current.length - 1].end : 0;
    if (gap > 1.0) flush();
    current.push(w);
    if (/[.?!]$/.test(w.word)) flush();
  }
  flush();
  return segments;
}

// OpenAI /v1/audio/transcriptions with response_format=verbose_json and word timestamps:
//   { language, words: [{ word, start, end }], segments?: [...] }
// The words carry no punctuation, so sentence boundaries are taken from the segments
// when they are present.
export function fromOpenAI(json) {
  const words = (json.words || []).map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })).filter((w) => w.word);
  const segs = json.segments || [];
  if (!segs.length) return { language: json.language || 'unknown', segments: groupWords(words) };
  const segments = segs.map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
    words: words.filter((w) => (w.start + w.end) / 2 >= s.start && (w.start + w.end) / 2 < s.end),
  })).filter((s) => s.text);
  return { language: json.language || 'unknown', segments };
}

// Spreads the words of a phrase evenly across its time span, for sources that only time
// whole phrases (captions, some speech providers).
function spreadWords(text, start, end) {
  const parts = text.split(/\s+/).filter(Boolean);
  const step = (end - start) / parts.length;
  return parts.map((word, k) => ({ word, start: start + k * step, end: start + (k + 1) * step }));
}

// Vercel AI SDK `experimental_transcribe` result: { text, segments: [{ text, startSecond,
// endSecond }], language }. With OpenAI and timestampGranularities ['word'] each segment is
// one word; other providers may return phrases, whose words are then spread evenly.
export function fromAiSdk(result) {
  const segs = (result.segments || []).filter((s) => s.text && s.text.trim());
  const wordLevel = segs.length > 0 && segs.every((s) => !/\s/.test(s.text.trim()));
  const words = wordLevel
    ? segs.map((s) => ({ word: s.text.trim(), start: s.startSecond, end: s.endSecond }))
    : segs.flatMap((s) => spreadWords(s.text.trim(), s.startSecond, s.endSecond));
  return { language: result.language || 'unknown', segments: groupWords(words) };
}

// SRT or WebVTT exported by a recorder or an editor. Cues have no word timing, so each
// word gets an even share of its cue.
export function fromSubtitles(text) {
  const ts = (s) => {
    const m = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/.exec(s);
    return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000;
  };
  const segments = [];
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim());
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const start = ts(a);
    const end = ts(b);
    const content = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (!content) continue;
    segments.push({ start, end, text: content, words: spreadWords(content, start, end) });
  }
  return { language: 'unknown', segments };
}

export function fullText(transcript) {
  return transcript.segments.map((s) => s.text).join(' ');
}

// Human- and agent-readable transcript: one line per segment, plus the pauses between
// segments, which matter for both cut decisions and reading time.
export function toMarkdown(transcript, title = 'Transcript') {
  const lines = [`# ${title}`, ''];
  let prevEnd = 0;
  for (const seg of transcript.segments) {
    const pause = seg.start - prevEnd;
    if (pause >= 1.5) lines.push(`_(pause ${pause.toFixed(1)}s)_`, '');
    lines.push(`**[${formatTime(seg.start)} → ${formatTime(seg.end)}]** ${seg.text}`, '');
    prevEnd = seg.end;
  }
  return lines.join('\n');
}
