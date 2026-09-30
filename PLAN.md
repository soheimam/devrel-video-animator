# DevRel Video Animator: Plan

> Status: brainstorm / pre-code. Nothing is built yet.

## The idea in one line

**Record normally, and get back a short list of suggested moments where a visual would help someone learn.** The DevRel person says yes or no to each one, and the tool renders it.

## The problem

DevRel engineers already know how to record. The part they hate is the edit. A 10-minute tutorial takes hours in After Effects to add the one diagram that makes the concept click, so most videos go out as a plain screen recording.

## Principles

1. **The human stays in charge.** The AI suggests and the person approves. Nothing reaches the final video without a yes.
2. **Few animations beat many.** Five good callouts are better than forty flashy ones.
3. **No new tool to learn.** It should feel like handing a file to a colleague.
4. **Keep it light.** Build it from a skill, a few scripts and loops, not a product.

## User flow

```
1. Record        DevRel records like they always do → drops video.mp4 in a folder
2. Transcribe    Whisper → transcript with a timestamp on every word
3. Look          ffmpeg grabs a few frames so the AI can see what's on screen
4. Suggest       Claude writes a cue sheet: when, what, which template, and why it helps learning
5. Review        DevRel reads or edits the cue sheet and watches a live preview in the browser
6. Render        The approved cues become anime.js overlays → ffmpeg lays them over the original
```

The person only touches it three times: **drop the file, review the suggestions, get the video.**

## Architecture: a skill, not a product

| Need | Tool |
|---|---|
| Transcription | Whisper (local or an API) gives word-level timestamps |
| Understanding | Claude reads the transcript and looks at sampled frames, so it knows what's on screen and what a callout would cover |
| Animation | anime.js, with its timeline paused and jumped to exact moments (`tl.seek(ms)`) so renders are deterministic |
| Rendering | Headless Chromium (Playwright) screenshots the overlay frames with a transparent background, and ffmpeg lays them over the original |
| Orchestration | A Claude Code skill (`SKILL.md`) that tells Claude how to run the pipeline |

### What the repo will contain

- `SKILL.md`: the pipeline steps and the editorial rules
- 3–4 small scripts: `transcribe`, `extract-frames`, `render-overlays`, `composite`
- `templates/`: a small library of anime.js templates
- `preview.html`: a single page that plays the video with the overlays running live

No backend, no database, no login, no upload UI.

## Editorial rules

Most of the value lives here. The AI should add an animation only when it clearly helps someone learn.

### Animate when…

| Trigger | Example |
|---|---|
| The idea is abstract and invisible | "The request goes to the edge, then the origin": draw the flow |
| There's a sequence | "Three steps": numbered list builds in |
| A new term is introduced | Short on-screen definition at the bottom (lower third) |
| A number matters | "Cuts latency by 40%": animated stat |
| The viewer needs to look somewhere specific | Highlight the one line of code being discussed |

### Don't animate when…

- The screen already shows it clearly
- It's an intro, a joke, filler, or "hey everyone"
- It would cover code while it's being typed
- Another animation just played (keep a budget of roughly **1 per 30–60s**)

### The learning-goal test

Every suggestion has to state **the learning goal in one sentence**. If Claude can't write that sentence, the cue doesn't go in. This is the main quality filter.

## Templates, not freestyle code

Claude does not write new anime.js from scratch for every video. That would be slow, inconsistent, off-brand and fragile. Instead there are about 6 templates:

`callout` · `highlight-region` · `term-definition` · `step-list` · `flow-diagram` · `stat`

Claude picks a template and fills in its settings. The **cue sheet** is plain data (JSON or YAML) that a DevRel person can read and tweak without knowing JavaScript. Brand colours and fonts sit in one theme file.

Example cue (illustrative):

```yaml
- at: 02:14.3
  duration: 4s
  template: flow-diagram
  params:
    nodes: [Client, Edge, Origin]
  position: top-right
  learning_goal: Show that requests hit the edge cache before the origin.
```

## Where loops fit

The skill is the core. Loops are optional extras:

- **A watch folder:** `/loop` or a scheduled routine checks `inbox/` for new recordings and writes cue sheets automatically. Add this after the skill works.
- **A quality pass:** once the draft cue sheet exists, a second pass critiques it against the editorial rules ("is this one really needed?") and cuts the weak ones. This is cheap and improves quality a lot.

## Risks

| Risk | Mitigation |
|---|---|
| **Render time.** A 10-minute video at 30fps is about 18,000 screenshots. | Only render the few seconds around each cue, then have ffmpeg overlay those clips at their timestamps (roughly a 20× speedup). |
| **Placement.** Overlays could cover what matters. | Frame snapshots, plus a "safe zone" setting in each template. |
| **Scope creep.** | Marketing extras wait for phase 2 (see below). |

## Phases

- **v0:** video in, cue sheet (markdown) out. This is already useful on its own: the DevRel person could hand it to an editor.
- **v1:** an HTML preview that plays the video with the overlays running live. This becomes the review step.
- **v2:** render to MP4.
- **v3:** brand theme, the watch folder, the marketing extras (chapter markers, YouTube descriptions, captions, short vertical clips).

**Start with v0.** Getting the cue sheet right is where the judgment lives. The rendering is the easy part.

## Open questions

1. **What kind of videos?** Screen recordings, talking head, or both? That changes where overlays can safely go.
2. **Where does it run?** On the DevRel person's laptop in Claude Code, or in the cloud? That decides local Whisper vs. a transcription API.
3. **Typical length?** 2-minute shorts or 20-minute deep dives?
4. **Brand:** do we have colours and fonts to work from?
5. **What counts as "done"?** A finished MP4, or a cue sheet plus preview they take into their own editor?
