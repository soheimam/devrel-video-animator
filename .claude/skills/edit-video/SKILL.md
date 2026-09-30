---
name: edit-video
description: Edit a DevRel recording end to end. Takes an MP4 and produces an edited MP4 with conservative cuts, zooms and educational anime.js overlays, plus a report explaining every decision, for human review before publishing. Use when someone drops a video in inbox/, asks to edit or animate a recording, or sends review notes on an edited video ("drop cue-3", "restore cut-1").
---

# edit-video

A human records a video and drops the MP4 in `inbox/`. You run this pipeline and hand back `out/<video>/edited.mp4` and `out/<video>/report.md`. A human reviews both before anything is published.

**The quality bar is the point.** Every edit must close a real gap in understanding (`editorial/STANDARD.md`). Few, precise edits beat many. "No changes needed" is a valid outcome, and so is a report that says so.

## Setup (first run)

```bash
npm install                      # anime.js, Playwright, yaml
ffmpeg -version                  # required
whisper --help                   # openai-whisper (pip install openai-whisper), or whisper.cpp (whisper-cli + WHISPER_CPP_MODEL)
tesseract --version              # optional: OCR of on-screen text, used for spelling and accuracy checks
```

If Whisper isn't available and the human has a transcript, pass it with `--transcript`.

## The pipeline

Run the stages in order. Stages 2, 3, 4 and 6 are judgment: delegate each to its subagent in `.claude/agents/`, so that no agent grades its own work. The rest are scripts.

| # | Stage | Who | Produces (in `out/<video>/`) |
|---|---|---|---|
| 1 | Ingest | `npm run ingest -- inbox/<file>.mp4` | `source.json`, `transcript.json`, `transcript.md`, `frames/` (+ grid copies, `ocr.json`) |
| 2 | Understand | **analyst** subagent | `content-map.md` |
| 3 | Propose | **editor** subagent | `edits.yaml` |
| 4 | Critique | **critic** subagent | `edits.yaml` (failures moved to `rejected:`) |
| 5 | Render | `npm run build -- out/<video>` | `overlays/*.mov`, `edited.mp4`, `check.json`, `check/*.jpg`, `report.md` |
| 6 | Check | **checker** subagent | `findings` in `check.json` |
| 7 | Report | `npm run report -- out/<video>` | final `report.md` |

### Stage notes

- **1 Ingest.** Options: `--out out/<name>`, `--model small|medium` (Whisper), `--transcript file.json`, `--every 10` (seconds between sampled frames), `--no-ocr`. Before transcribing, make sure `editorial/GLOSSARY.md` has the video's product names; Whisper is prompted with it.
- **2–4.** Give each subagent the video's folder (`out/<video>`). Wait for each to finish before starting the next. After the critic, `npm run validate -- out/<video>` must pass with no errors.
- **5 Build** runs validate → render overlays (Chromium seeks each anime.js timeline frame by frame; only the cue's seconds are rendered) → compose (one ffmpeg pass: constant frame rate → zooms → overlays → cuts) → automated checks → report.
- **6 Check.** If the checker returns `fix` findings, apply them to `edits.yaml` (anchors, timing, wording, or move the cue to `rejected:`), then re-run stage 5 and stage 6. Allow at most two rounds. If problems remain, leave them as findings for the human; don't hide them.
- **7 Report** again after the checker, so its findings appear in `report.md`.

## Handing over

Tell the human, briefly:
- where `edited.mp4` and `report.md` are
- the length change, the number of edits and rejections
- anything the checker flagged, and any accuracy concerns from the content map

Don't restate the whole report.

## Revising from review notes

The human reviews `edited.mp4` and `report.md`, then replies with notes by id.

1. Record every decision in `out/<video>/review.yaml`. Edits the reviewer didn't mention count as `keep` once they approve:
   ```yaml
   reviewer: <name>
   decisions:
     - { id: cue-1, decision: keep }
     - { id: cue-3, decision: drop, note: "screen already shows it" }
     - { id: cut-1, decision: restore, note: "that was the install command" }
     - { id: cue-2, decision: adjust, note: "half a second earlier" }
   ```
2. Apply the notes to `edits.yaml`:
   - `drop`: move the item to `rejected:` with `rule: "human review: <note>"`.
   - `restore`: move the cut to `rejected:` the same way.
   - `adjust`: edit it in place.
3. `npm run build -- out/<video>`, run the checker, `npm run report -- out/<video>`.
4. If a note reveals a pattern rather than a one-off ("you always zoom too tight", "never define terms the title already uses"), add it to `editorial/LEARNINGS.md`. That's how the standard improves.

`npm run metrics` summarises precision (the share of edits kept) and restored cuts across all reviewed videos. Restored cuts are the most serious miss.

## Hands-off mode

To process new recordings automatically, run this skill on a loop over the inbox:

```
/loop 30m Run the edit-video skill on any MP4 in inbox/ that has no out/<name>/report.md yet.
```

The human review before publishing still applies. The loop only prepares the edit.

## Non-negotiables

- Never cut content that carries information. When unsure, keep the footage.
- Never put a number, fact or claim on screen that the video doesn't contain.
- Never skip the critic or the checker, even for a "simple" video.
- Never publish. Humans publish.
