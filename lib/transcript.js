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

// whisper.cpp run with `-ml 1 -sow -oj` emits one entry per word, times in milliseconds.
export function fromWhisperCpp(json) {
  const words = (json.transcription || [])
    .map((t) => ({
      word: t.text.trim(),
      start: t.offsets.from / 1000,
      end: t.offsets.to / 1000,
    }))
    .filter((w) => w.word);
  return { language: json.result?.language || 'unknown', segments: groupWords(words) };
}

// Transformers.js automatic-speech-recognition output with return_timestamps: 'word':
//   { text, chunks: [{ text, timestamp: [start, end] }] }
// The final word's end can be null; give it a short, plausible duration.
export function fromTransformers(output, language = 'unknown') {
  const words = (output.chunks || [])
    .map((c) => {
      const [start, end] = c.timestamp;
      return { word: c.text.trim(), start, end: end ?? start + 0.3 };
    })
    .filter((w) => w.word);
  return { language, segments: groupWords(words) };
}

// scripts/engines/pocketsphinx_transcribe.py output: one entry per detected utterance.
// PocketSphinx emits no punctuation, so utterances are split at pauses and then into
// readable runs of at most 15 words.
export function fromPocketsphinx(json, maxWords = 15) {
  const segments = [];
  for (const seg of (json.utterances || []).flatMap((u) => groupWords(u.words))) {
    for (let i = 0; i < seg.words.length; i += maxWords) {
      const words = seg.words.slice(i, i + maxWords);
      segments.push({ start: words[0].start, end: words[words.length - 1].end, text: words.map((w) => w.word).join(' '), words });
    }
  }
  return { language: 'en', segments };
}

export function fullText(transcript) {
  return transcript.segments.map((s) => s.text).join(' ');
}

// Human- and agent-readable transcript: one line per segment, plus the pauses between
// segments, which matter for both cut decisions and reading time.
export function toMarkdown(transcript, title = 'Transcript') {
  const lines = [`# ${title}`, ''];
  if (transcript.engine_note) lines.push(`> **Note:** ${transcript.engine_note}`, '');
  let prevEnd = 0;
  for (const seg of transcript.segments) {
    const pause = seg.start - prevEnd;
    if (pause >= 1.5) lines.push(`_(pause ${pause.toFixed(1)}s)_`, '');
    lines.push(`**[${formatTime(seg.start)} → ${formatTime(seg.end)}]** ${seg.text}`, '');
    prevEnd = seg.end;
  }
  return lines.join('\n');
}
