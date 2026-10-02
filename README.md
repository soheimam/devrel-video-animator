# devrel-video-animator

Record a screen recording, upload the MP4, and get back suggestions for educational animations (anime.js), zooms, cuts and captions, each shown as a GIF. Pick the ones you want, and the final video is rendered with your picks.

```
you:     upload videos/my-talk.mp4
agent:   transcribes, looks at the frames, writes out/my-talk/edits.yaml with suggestions,
         renders a GIF of each, opens a review PR
you:     "keep cue-1, drop cue-3, cue-2 a second later"
agent:   re-renders → out/my-talk/edited.mp4 with captions burned in
```

Two ways in: a Claude Code skill for anyone with the repo, and a small web app (`web/`) where you sign in with a passcode, drop the file, and review the result with checkboxes. The web app runs the same scripts in a Vercel Sandbox, with one AI Gateway key for transcription and the agent.

## Quick start

Requirements: Node 22+, ffmpeg, and a transcription key in `.env` (copy `.env.example`; OpenAI, Deepgram or the AI Gateway, through the [Vercel AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/transcription)). Or skip the key and import captions exported from your recorder (`--from file.srt`).

```bash
npm install
cp .env.example .env   # set one key; AI_GATEWAY_API_KEY is the simplest
npm run doctor         # checks Node, ffmpeg, Chromium and the key
npm run demo        # synthetic recording, end to end → out/demo/edited.mp4, report.md, preview/*.gif
npm test
```

Then open Claude Code in this repo and say:

> Animate videos/my-talk.mp4

## What's where

| Path | What it is |
|---|---|
| `.claude/skills/animate-video/SKILL.md` | The whole flow, and how to suggest well |
| `editorial/` | `STANDARD.md` (when a visual helps), `STYLE.md` (the Base look, with references), `MOTION.md` (the animation principles) |
| `templates/` | anime.js templates, the theme, and the stage they render on |
| `scripts/` | `doctor`, `ingest` (transcribe + frames), `validate`, `render` (overlays, compose, captions, previews, report), `agent` (the skill run headless, via the AI SDK), `job` (one upload start to finish), `site`, `demo` |
| `web/` | The front door on Vercel: passcode, drop zone, progress, review with checkboxes and notes. See `web/README.md` |
| `lib/` | timeline maths, validation, captions, ffmpeg helpers |
| `examples/demo/edits.yaml` | Reference edit list |
| `videos/` | Upload recordings here |

## Templates

`callout` · `term-definition` · `step-list` · `flow-diagram` · `comparison` · `highlight-region` · `code-focus` · `zoom`

Overlays are rendered deterministically: each cue's anime.js timeline is built paused and stepped frame by frame in headless Chromium, then composited by ffmpeg along with zooms, cuts and captions in one pass. Templates are laid out in design pixels (short side = 1080), so they work for any resolution and for vertical video. Brand colours and type live in `templates/theme.css`.

## The edit list

All decisions for a video live in `out/<video>/edits.yaml`, in source-video time: cuts, cues, captions placement, and the ideas considered but left out. Any single item can be dropped or restored and the video re-rendered.
