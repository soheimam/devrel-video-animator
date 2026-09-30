import { formatTime } from './time.js';

// Every transcript is normalised to:
//   { language, segments: [{ start, end, text, words: [{ word, start, end }] }] }
// with times in seconds on the source video's timeline.

export function fromOpenAIWhisper(json) {
  return {
    language: json.language || 'unknown',
    segments: (json.segments || []).map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      words: (seg.words || []).map((w) => ({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
      })),
    })),
  };
}

// whisper.cpp run with `-ml 1 -sow -oj` emits one entry per word, times in milliseconds.
// Words are regrouped into sentence-sized segments.
export function fromWhisperCpp(json) {
  const words = (json.transcription || [])
    .map((t) => ({
      word: t.text.trim(),
      start: t.offsets.from / 1000,
      end: t.offsets.to / 1000,
    }))
    .filter((w) => w.word);
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
  return { language: json.result?.language || 'unknown', segments };
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
