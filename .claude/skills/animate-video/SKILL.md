---
name: animate-video
description: Suggest and render educational anime.js animations, zooms, cuts and captions for a DevRel screen recording. Use when someone uploads an MP4 to videos/, asks to animate or edit a recording, or replies with picks on suggestions ("keep cue-1, drop cue-3").
---

# animate-video

A DevRel engineer records a video and uploads the MP4 to `videos/`. You transcribe it, **suggest** where an animation would help someone learn, show each suggestion as a GIF, and the human picks. Then you render the final video with their picks and captions.

You suggest, the human decides. Be generous with suggestions and honest about doubts; a flagged idea costs the reviewer two seconds, a missing one costs them the chance to see it.

## Setup

```bash
npm install            # anime.js, Playwright (headless Chromium), yaml, Vercel AI SDK
cp .env.example .env   # set one key (AI_GATEWAY_API_KEY, OPENAI_API_KEY or DEEPGRAM_API_KEY); the provider follows the key
npm run doctor         # checks Node, ffmpeg, Chromium and the key; says exactly what's missing
```

## 1. Ingest

```bash
npm run ingest -- videos/<file>.mp4            # → out/<name>/
npm run ingest -- videos/<file>.mp4 --from videos/<file>.srt   # captions from the recorder instead
```

Transcription is one call through the AI SDK's `experimental_transcribe` (word timestamps; nothing to download). Produces `source.json` (size, fps, duration), `transcript.json` + `transcript.md`, and `frames/` with a `.grid.jpg` copy of each frame. Grid lines are every 240 design px; coordinates in `edits.yaml` are design px (short side = 1080, origin top-left; a 1920×1080 or 1108×720 video is 1920×1080 or 1662×1080 in design px; `source.json` has the size, and `node -e "import('./lib/design.js').then(m=>console.log(m.designSpace(W,H)))"` the design frame).

## 2. Suggest: write `out/<name>/edits.yaml`

Read `transcript.md` and look at the frames yourself. Capture more at any moment you consider: `npm run frames -- out/<name> --at 00:42.0,01:10.5`.

Then go through the video and ask, every 20–30 seconds: **what would a viewer miss here?**

| Viewer's problem | Suggest |
|---|---|
| Something is described but never shown (an architecture, a request path, a sequence) | `flow-diagram`, `step-list` |
| A term is used that a newcomer wouldn't know, and the screen doesn't define it | `term-definition` at its first mention |
| The thing being discussed is on screen but small or lost among other things | `zoom` (makes it readable), `code-focus` (dims the rest), `highlight-region`, `callout` |
| Two things are being contrasted | `comparison` |
| Dead air, a false start, a long wait, the tail after the sign-off | a cut |

Rules of thumb:
- **Prefer visible overlays** (callout, term card, step-list, diagram) to crops. A zoom alone leaves the video looking unedited.
- **Time to the word.** Start a cue 0.1–0.3s before the word it relates to (`transcript.json` has every word).
- **Wording comes from the screen or the narration.** Never invent a fact or a number; quote what's there.
- **Keep clear of** the webcam bubble, the bottom 15% (captions), and whatever is being discussed. Pick anchors and panel positions from the grid frames.
- **Don't stack zooms** on footage the recorder already zoomed (look for sudden scale changes between frames).
- **Cuts** remove only silence and mistakes, never content. Keep ~0.4s either side of a cut so the pacing breathes. Put boundaries in silence.
- **Captions** are on by default; set `captions: { avoid: { x, y, w, h } }` to keep them clear of a webcam in the bottom corner.

Put ideas you considered and left out under `rejected:` with the reason, so the reviewer sees your thinking. Add a one-line `rationale` to every suggestion, and say in it when timing or wording is a guess.

Reference: `examples/demo/edits.yaml`. Quote any YAML string containing `: `.

Templates and their params:

| template | params | placement |
|---|---|---|
| `zoom` | `region {x,y,w,h}` | the region, 2–5s |
| `code-focus` | `region`, `label?` | region |
| `highlight-region` | `region`, `label?` | region |
| `callout` | `text`, `side?: left \| right` | `anchor {x,y}` on the thing itself |
| `term-definition` | `term`, `gloss` | optional `anchor` (panel top-left); default bottom-left |
| `step-list` | `title?`, `steps: [text \| {text, at}]` | optional `anchor`; default top-right |
| `flow-diagram` | `title?`, `nodes: [label \| {label, at}]`, `direction?`, `trace?` | optional `anchor`; default top-right |
| `comparison` | `left {title, items[]}`, `right {title, items[], at?}` | optional `anchor`; default top-left |

## 3. Render and show

```bash
npm run render -- out/<name>
```

Validates `edits.yaml` (overlaps, cue over a cut, caption zone, reading time, numbers that aren't in the narration), renders the overlays, composes `edited.mp4` with captions burned in, writes `captions.srt`/`.vtt`, a GIF of every cue in `preview/`, and `report.md`. Fix any validation errors it prints.

**Look at every GIF yourself** before handing over. A label covering the code it describes only shows up visually.

Then open a review PR (`git add -f out/<name>`; `out/` is ignored) containing `edited.mp4`, `report.md`, `edits.yaml`, `captions.*` and `preview/`. In the description: a direct link to the video (`https://github.com/<owner>/<repo>/raw/<branch>/out/<name>/edited.mp4`) and **every GIF embedded** (`![cue-1](https://github.com/<owner>/<repo>/blob/<branch>/out/<name>/preview/cue-1.gif?raw=true)`) with one line each on what it shows and why. Also send the video and the GIFs in chat.

## 4. Apply the picks

The reviewer answers with picks: `keep cue-1`, `drop cue-3`, `cue-2 at 1:10`, `cue-4 should say "…"`, `restore cut-2`. Apply them to `edits.yaml` (dropped items move to `rejected:` with `rule: "reviewer"`), run `npm run render` again, and update the PR. Repeat until they're happy. Humans publish.
