# DevRel Video Animator: Plan

## The request

A DevRel engineer records a video. The AI transcribes it and **suggests where animations would add educational value**, using anime.js, only where they help. The human picks. Keep it lightweight: a skill and a few scripts, not a product.

## The flow

```
1. Ingest     transcript with word timestamps (one API call, or the recorder's captions) + frames
2. Suggest    one agent writes edits.yaml: animations, zooms, cuts, captions placement, with a GIF of each
3. Pick       the human keeps / drops / adjusts, in the PR or in chat
4. Render     final MP4 with the picks, captions burned in
```

## What exists

- **Templates** (anime.js): callout, term-definition, step-list, flow-diagram, comparison, highlight-region, code-focus; zoom is done in ffmpeg. Rendered deterministically in headless Chromium, composited by ffmpeg.
- **Scripts:** `ingest`, `frames`, `validate`, `build` (render → compose → captions → GIF previews → report), `demo`.
- **Captions:** word-timed from the transcript, following the cuts, burned in plus SRT/VTT.
- **Validation:** only what prevents broken renders: schema, overlapping cues, a cue across a cut, text in the caption zone, reading time, numbers that aren't in the narration.
- **One skill** (`.claude/skills/animate-video/SKILL.md`) and one page of taste (`editorial/STANDARD.md`).

## What we learned (v1 → v2)

The first version let agents edit autonomously, with an analyst, an editor, an adversarial critic and a checker, a 130-line standard, 16 validation rules, and four transcription engines (one of them a 300 MB model download). The result on a real recording was zero animations: every candidate died in the critic. The reviewer couldn't give feedback on nothing. v2 goes back to the request: the agent suggests generously and shows each idea; the human is the critic. Transcription is one HTTP call. Dependencies went from 519 MB to 17 MB.

## Next

1. First real run on `videos/vibetnet.mp4` with a proper transcript, and a review PR with GIFs.
2. Adjust the suggestion guidance from what the reviewer keeps and drops.
3. Then, if wanted: a watch loop over `videos/`, chapter markers, short clips.

## Open

- Transcript source on the team's machines: `OPENAI_API_KEY`, or captions from the recorder? (Both work; the API is the default.)
- Brand colours and fonts for `templates/theme.css`.
