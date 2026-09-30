# DevRel Video Animator: Plan

> Status: v0 (judgment) and v1 (render) are built. v2's revision loop and metrics are in the skill and scripts, v3's hands-off mode is a documented `/loop`. The marketing extras are not started. See README.md.

## The idea in one line

**A human records and drops in an MP4. Agents edit it (tightening cuts, zooms and educational animations) and hand back an edited MP4 with a report explaining every decision. A human reviews it before publishing.**

## The problem

DevRel engineers already know how to record. The part they hate is the edit. A 10-minute tutorial takes hours to tighten up and to add the one diagram that makes the concept click, so most videos go out as a plain, unedited screen recording.

## Principles

1. **Agents edit, humans set the standard.** Humans provide the MP4, the editorial standard, and the final sign-off. Agents do everything in between.
2. **Every edit must earn its place.** Animations exist to close a gap in understanding, never for decoration. "No changes needed" is a valid result.
3. **Never cut useful content.** Cuts remove dead air and mistakes, not substance. When in doubt, keep it.
4. **Never introduce new facts.** On-screen text only restates or structures what was said or shown.
5. **Every decision is explained and reversible.** Nothing is baked in until the human signs off.
6. **Keep it light.** Build it from a skill, subagents, scripts and loops, not a product.

## Who does what

| Human | Agents |
|---|---|
| Records the video, uploads the MP4 to `videos/` | Transcribe, understand, propose, critique, render, check |
| Maintains the editorial standard and glossary | Apply the standard to every video |
| Reviews the edited MP4 and report before publishing | Revise based on review notes |

## User flow

```
Human:   upload video.mp4 to videos/
           │
Agents:  1. Ingest      transcript with word-level timestamps, frames, text read off the screen
         2. Understand  content map: objectives, segments, terms, steps, code on screen
         3. Propose     candidate cuts, zooms and animations
         4. Critique    a separate agent argues to cut each one; only survivors stay
         5. Render      apply cuts, zooms, overlays → edited MP4
         6. Check       inspect the rendered frames: occlusion, legibility, sync, spelling
         7. Report      edit report: every edit kept AND every candidate rejected, with reasons
           │
Human:   review edited.mp4 + report.md
           ├─ approve → publish
           └─ notes ("drop cue 4", "restore cut 2") → agents revise and re-render
```

The human touches it twice: **drop the file, review the result.**

---

## The editorial standard

This is the heart of the project. It lives in `editorial/STANDARD.md`, and every agent reads it. It is grounded in multimedia learning research (Mayer's principles, cognitive load theory), not in taste.

### The gap test

A video already carries two channels: **what is said** and **what is shown**. An animation is justified only where there is a gap between them. Every proposed animation must name its gap, or it is rejected.

| Gap | Meaning | Right tool |
|---|---|---|
| **Said, not shown** | Narration describes something invisible (architecture, data flow) | Diagram |
| **Shown, not findable** | It's on screen, but lost among other content | Zoom, highlight, code focus |
| **Said once, then gone** | A term or list the viewer needs to keep in mind while watching | Text that stays on screen |
| **Relationship not visible** | Before/after, cause/effect, comparison | Structured visual |

Every animation must also serve one of the video's learning objectives from the content map. A cue that is correct but beside the point is rejected.

### Design rules

| Principle | Rule |
|---|---|
| **Coherence** | Nothing decorative: no animated logos, no motion for "energy". The default is to add nothing. |
| **Signalling** | Guide attention to what matters, preferably by dimming the rest rather than adding more on top. |
| **Redundancy** | Never put on screen the sentence being spoken. Show the *structure* of the idea, not a transcript of it. |
| **Temporal contiguity** | The animation appears on the exact *word* it relates to (word-level timestamps), not near the sentence. |
| **Spatial contiguity** | Labels sit next to the thing they describe. Callouts are anchored to an element's position in the frame, not dropped in a corner. |
| **Split attention** | No animation while the viewer is reading code or watching someone type. One focus at a time. |
| **Segmenting** | Break multi-step processes into steps the viewer can follow. |

### Motion and timing

- Motion carries meaning: direction shows flow, and appearing means "new".
- Consistent, restrained easing; no elastic bounce. Entrances around 300ms.
- Hold text long enough to read: about **0.3s per word + 1s**.
- How often to animate follows from the gaps, not the clock. There is a hard maximum and a minimum spacing between cues, but the target is "as many as the gaps justify", and that can be zero.

### Accuracy

Nothing loses a developer audience faster than a typo in a technical term or a made-up number.

- **Nothing new in overlays.** They restate or structure what was said or shown; they never introduce a fact.
- **Technical terms are verified.** Whisper gets a glossary (`editorial/GLOSSARY.md`), and every on-screen term is cross-checked against text read off the frames (OCR) and the glossary.
- **Code is quoted exactly** from what appears on screen, never retyped from the transcript.

### Readability

- A minimum font size that still reads on a phone screen.
- A contrast check on every overlay; no meaning carried by colour alone.
- Keep the bottom ~15% of the frame clear for captions.

## Cutting rules

Cuts are in scope, but conservative. **When in doubt, keep.**

**Candidates for a cut:**
- Dead air: long silences with nothing happening on screen
- False starts and failed takes, where the presenter restarts the same point
- Filler that carries nothing ("um, so, let me just…")
- Waiting on things: installs, builds, page loads (shorten rather than remove, so the viewer knows time passed)

**Never cut:**
- Anything that carries information, even if it's said clumsily
- **Pauses while code or a diagram is on screen.** That is reading time for the viewer.
- Deliberate pauses for emphasis
- The steps that make the video reproducible (a command the viewer needs to type, even if boring)

Every cut goes through the critique step. It is listed in the report with its source timestamps and can be restored with one note.

## Templates

Agents do not write new animation code per video. They pick a template and fill in its settings, so the output stays consistent, on-brand and reviewable.

| Template | Closes gap | Notes |
|---|---|---|
| `zoom` | Shown, not findable | Punch into small text in screen recordings. Probably the most valuable edit of all. Done in ffmpeg, not as an overlay. |
| `code-focus` | Shown, not findable | Dim everything except the lines being discussed. |
| `highlight-region` | Shown, not findable | Outline an area of the UI. |
| `callout` | Shown, not findable / Said, not shown | Short label anchored to an element. |
| `term-definition` | Said once, then gone | The term plus a short gloss, not the narrated sentence. |
| `step-list` | Said once, then gone | Builds step by step; stays up while the steps are done. |
| `flow-diagram` | Said, not shown | Nodes and arrows; direction shows data flow. |
| `comparison` | Relationship not visible | Before/after or A vs B. Replaces the earlier `stat` idea; an animated counter is decoration. |

Brand colours and fonts live in one theme file.

## The edit decision list

All decisions live in one data file per video (`edits.yaml`), **always in source-video time**. Cuts and cues are independent, which makes every edit reversible: dropping one is a one-line change and a re-render.

```yaml
video: intro-to-edge-caching.mp4
objectives:
  - Understand that requests hit the edge cache before the origin
  - Know how to set a cache TTL header

cuts:
  - id: cut-1
    from: 00:41.2
    to: 00:47.9
    reason: False start; the presenter restarts the same sentence at 00:48.0.

cues:
  - id: cue-1
    at: 02:14.3                # the word "edge"
    duration: 4.2s
    template: flow-diagram
    params:
      nodes: [Client, Edge, Origin]
    anchor: { x: 1180, y: 160 }  # clear area, away from the code
    gap: said-not-shown
    objective: 1
    rationale: The flow is described verbally but never drawn.
```

**Rule:** a cue may not span a cut. The critic rejects any that does.

## The edit report

`report.md` is what the human reviews next to the video:

- The video's learning objectives, as the agents understood them
- **Every edit kept:** timestamp, what it is, the gap it closes, why
- **Every candidate rejected:** what it was and which rule killed it
- Check results: any warnings the check step raised
- How to give notes: "drop cue-3", "restore cut-1", "cue-2 is too early"

Showing the rejected candidates matters. It lets the reviewer see the agents' judgment, not just the output.

---

## Architecture

| Need | Tool |
|---|---|
| Transcription | Whisper in Node (Transformers.js, an npm dependency), word-level timestamps, glossary corrections |
| Visual understanding | ffmpeg scene detection plus frames at every cue candidate; Claude looks at them; OCR for on-screen text |
| Animation | anime.js templates, with the timeline paused and jumped to exact moments (`tl.seek(ms)`) so renders are deterministic |
| Overlay rendering | Headless Chromium (Playwright) screenshots overlay frames with a transparent background, only for the seconds around each cue |
| Cuts, zooms, compositing | ffmpeg: trim and join the kept ranges, crop and scale for zooms, overlay the cue clips at their times, copy the audio untouched |
| Orchestration | A Claude Code skill that runs each stage as a separate subagent |

**Why separate subagents:** an agent grading its own proposals goes easy on them. The critic and the checker must be independent of the proposer.

### Repo layout

```
.claude/
  skills/edit-video/SKILL.md     # the pipeline: stages, inputs, outputs
  agents/
    analyst.md                   # transcript + frames → content map
    editor.md                    # content map → candidate cuts & cues
    critic.md                    # argues to cut each candidate, applies the standard
    checker.md                   # inspects rendered frames
editorial/
  STANDARD.md                    # the editorial standard (this doc's rules, expanded)
  GLOSSARY.md                    # technical terms, correct spellings
  LEARNINGS.md                   # patterns from human review notes
templates/                       # anime.js templates + theme.css
scripts/
  transcribe                     # Whisper → transcript.json
  frames                         # scene detection, frame capture, OCR
  render-overlays                # Playwright → transparent clips per cue
  compose                        # ffmpeg: cuts, zooms, overlays → edited.mp4
videos/                          # humans upload MP4s here
out/<video>/                     # edited.mp4, edits.yaml, report.md, content-map.md
```

### Technical notes

- Match the source's resolution and frame rate. Templates are designed in a 1920×1080 coordinate space and scaled to the source. Vertical video is supported.
- Render overlays only around cues, not the whole video. A 10-minute video at 30fps would otherwise be about 18,000 screenshots.
- Cuts are applied at compose time. Cues are mapped from source time to output time automatically.

## Measuring quality

There is no benchmark yet. It gets built from real use:

1. **Draft first.** Run the pipeline on the first real DevRel videos.
2. **The human review is the evaluation data.** For each edit, the reviewer's decision (keep, drop or adjust) is recorded.
3. **Main metric: precision.** Of the edits the agents made, what share did the human keep? A missed opportunity costs little; a pointless animation or a bad cut damages the video.
4. **Second metric: restored cuts.** Any cut the human restores is a serious miss, because it means useful content was removed.
5. **Feed review notes back.** Recurring notes become rules in `editorial/LEARNINGS.md` and then in `STANDARD.md`.
6. Once a few videos are reviewed, freeze them as a **benchmark set** and re-run it whenever the standard or the prompts change.

## Risks

| Risk | Mitigation |
|---|---|
| Decorative animations creeping in | Gap test, independent critic, "no changes" allowed, precision tracked |
| Cutting useful content | Conservative cut rules, critic review, every cut listed and restorable, restored cuts tracked |
| Typos or hallucinated facts on screen | Nothing-new rule, glossary, OCR cross-check, checker agent |
| Overlays covering important content | Anchoring from frame analysis; the checker inspects rendered frames |
| Render time | Render only around cues; ffmpeg does the heavy lifting |
| Scope creep | Marketing extras wait for v3 |

## Phases

- **v0: Judgment.** MP4 in → content map, `edits.yaml` (cuts + cues), critique, `report.md`. No rendering yet. The judgment is the product, so prove it first.
- **v1: Render.** Templates, overlay rendering, cuts and zooms, the check step → `edited.mp4`.
- **v2: Revision loop.** The human gives notes, the agents re-render. Review decisions are logged, and the benchmark is built from them.
- **v3: Hands-off delivery and extras.** Watch `videos/` with a loop so "upload an MP4, get an edited MP4" happens automatically. Then the marketing extras: chapter markers, YouTube descriptions, captions, short vertical clips.

## Open questions

1. **What kind of videos?** Screen recordings, talking head, or both? That changes where overlays can safely go and how useful zooms are.
2. **Where does it run?** On a laptop in Claude Code, or in the cloud? That decides local Whisper vs. a transcription API.
3. **Typical length?** 2-minute shorts or 20-minute deep dives?
4. **Brand:** colours and fonts to build the theme from?
5. **Glossary:** a starting list of product names and technical terms we must always spell correctly?
