# devrel-video-animator

**Record a video, drop in the MP4, get back an edited MP4 and a report explaining every decision.**

Claude Code agents do the editing: conservative cuts, zooms, and educational overlays animated with [anime.js](https://animejs.com). A human reviews the result before publishing. Every edit has to close a real gap in understanding, per the [editorial standard](editorial/STANDARD.md). Decoration doesn't make the cut, and "no changes needed" is a valid result.

There is no app, server or database. It's a Claude Code skill, four subagents, and a handful of scripts. See [PLAN.md](PLAN.md) for the reasoning.

## How it works

```
Human:   drop video.mp4 in inbox/
Agents:  1. Ingest      Whisper transcript (word timestamps), frames, OCR     npm run ingest
         2. Understand  content map: objectives, terms, landmarks            analyst
         3. Propose     cuts, zooms, overlays → edits.yaml                   editor
         4. Critique    argue to remove each edit; failures → rejected       critic
         5. Render      anime.js → transparent clips → one ffmpeg pass       npm run build
         6. Check       inspect the rendered frames                          checker
         7. Report      every edit kept and every candidate rejected         npm run report
Human:   review edited.mp4 + report.md → publish, or send notes ("drop cue-3")
```

## Quick start

Requirements: Node 20+, ffmpeg, and for real videos Whisper (`pip install openai-whisper`, or whisper.cpp). Tesseract is optional; it enables OCR-based spelling and accuracy checks.

```bash
npm install
npm run demo        # builds a synthetic recording end to end → out/demo/edited.mp4 + report.md
npm test
```

To edit a real recording, open Claude Code in this repo and say:

> Edit inbox/my-talk.mp4

The [`edit-video` skill](.claude/skills/edit-video/SKILL.md) runs the whole pipeline. To process new recordings automatically:

```
/loop 30m Run the edit-video skill on any MP4 in inbox/ that has no out/<name>/report.md yet.
```

## What's where

| Path | What it is |
|---|---|
| `.claude/skills/edit-video/SKILL.md` | The pipeline the orchestrating agent follows, including revising from review notes |
| `.claude/agents/` | `analyst`, `editor`, `critic`, `checker`: separate agents so none grades its own work |
| `editorial/STANDARD.md` | The editorial standard: the gap test, design rules, accuracy, cutting rules |
| `editorial/rules.yaml` | Numeric thresholds, enforced by `npm run validate` |
| `editorial/GLOSSARY.md` | Correct spellings of technical terms; prompts Whisper and catches mis-hearings |
| `editorial/LEARNINGS.md` | Patterns from human review, promoted into the standard over time |
| `templates/` | anime.js overlay templates, the brand theme, and the stage used to render them |
| `scripts/` | ingest, frames, validate, render-overlays, compose, check, report, build, metrics, demo |
| `examples/demo/` | A reference `edits.yaml` and transcript |

## Templates

| Template | Closes the gap | What it does |
|---|---|---|
| `zoom` | shown, not findable | Punches into small text (ffmpeg, eased in and out) |
| `code-focus` | shown, not findable | Dims everything except the lines being discussed |
| `highlight-region` | shown, not findable | Outlines an area of the UI |
| `callout` | shown, not findable / said, not shown | Short label anchored to an element |
| `term-definition` | said once, then gone | A new term and a short gloss |
| `step-list` | said once, then gone | Steps revealed on the words that name them |
| `flow-diagram` | said, not shown | Nodes and arrows drawn in the direction of flow |
| `comparison` | relationship not visible | Before/after, side by side |

The templates are laid out in design pixels (short side = 1080) and render at the source resolution, for landscape or vertical video. Brand colours and type live in `templates/theme.css`.

## The edit decision list

Every decision for a video lives in `out/<video>/edits.yaml`, in source-video time. Cuts and cues are independent, so any single edit can be dropped or restored with a one-line change and a re-render. See [`examples/demo/edits.yaml`](examples/demo/edits.yaml).

## Measuring quality

Each human review is recorded in `out/<video>/review.yaml`. `npm run metrics` reports:
- **precision:** the share of the agents' edits the reviewer kept
- **restored cuts:** cuts the reviewer put back. This is the most serious miss, because it means useful content was removed.
