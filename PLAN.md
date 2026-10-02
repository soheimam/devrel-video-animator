# DevRel Video Animator: Plan

## The request

A DevRel engineer records a video. The AI transcribes it and **suggests where animations would add educational value**, using anime.js, only where they help. The human picks. Keep it lightweight: a skill and a few scripts, not a product.

## The flow

```
1. Ingest     transcript with word timestamps (AI SDK transcribe: OpenAI or Deepgram; or the recorder's captions) + frames
2. Suggest    one agent writes edits.yaml: animations, zooms, cuts, captions placement, with a GIF of each
3. Pick       the human keeps / drops / adjusts, in the PR or in chat
4. Render     final MP4 with the picks, captions burned in
```

## What exists

- **Templates** (anime.js): callout, term-definition, step-list, flow-diagram, comparison, highlight-region, code-focus; zoom is done in ffmpeg. Rendered deterministically in headless Chromium, composited by ffmpeg.
- **Scripts:** `doctor`, `ingest`, `frames`, `validate`, `render` (overlays → compose → captions → GIF previews → report), `site`, `demo`.
- **Captions:** word-timed from the transcript, following the cuts, burned in plus SRT/VTT.
- **Validation:** only what prevents broken renders: schema, overlapping cues, a cue across a cut, text in the caption zone, reading time, numbers that aren't in the narration.
- **One skill** (`.claude/skills/animate-video/SKILL.md`) and one page of taste (`editorial/STANDARD.md`).

## What we learned (v1 → v2)

The first version let agents edit autonomously, with an analyst, an editor, an adversarial critic and a checker, a 130-line standard, 16 validation rules, and four transcription engines (one of them a 300 MB model download). The result on a real recording was zero animations: every candidate died in the critic. The reviewer couldn't give feedback on nothing. v2 goes back to the request: the agent suggests generously and shows each idea; the human is the critic. Transcription is one HTTP call. Dependencies went from 519 MB to 17 MB.

## Next

1. ~~First real run on `videos/vibetnet.mp4` with a proper transcript, and a review PR with GIFs.~~ Done: PR #17 (four rounds) and #18.
2. ~~Adjust the suggestion guidance from what the reviewer keeps and drops.~~ Ongoing: every review note becomes a rule (STYLE.md, MOTION.md, the validator).
3. **A recording arrives as a PR and the agents do the rest**: `plans/pr-workflow.md`.

## Open

- Which key the team uses: OpenAI, Deepgram or the AI Gateway (all wired; `.env.example`).
- Brand colours and fonts for `templates/theme.css`.
