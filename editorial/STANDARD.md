# The editorial standard

Every agent in the pipeline reads this file. It defines when an edit earns its place. The numeric thresholds live in `rules.yaml` and are enforced by `npm run validate`. The judgment calls below are applied by the editor, and enforced by the critic.

The standard is grounded in multimedia learning research (Mayer's principles, cognitive load theory), not in taste. When two rules pull in different directions, the viewer's understanding wins.

---

## 0. What a finished edit includes

Every edit must earn its place, and decoration never does: an edit that doesn't help understanding spends the viewer's attention for nothing. But a finished edit is expected to **visibly improve the video** (reviewer feedback, `LEARNINGS.md` 2026-09-30). It always includes:

1. **Captions** (§5a). Accessibility, and many developers watch muted.
2. **A tightening pass** (§6). Dead air, false starts and waiting, shortened.
3. **Visuals wherever the gap test finds a gap** (§1). A product walkthrough almost always has several: a term the page doesn't explain, a mechanism described but never drawn, a value too small to read.

"No visual edits" is still possible, but only with an explicit justification in the report. It is not the safe default. When a candidate passes the gap test but its timing or wording is uncertain, **keep it and flag the uncertainty** for the reviewer; don't silently drop it.

## 1. The gap test

A video carries two channels: **what is said** and **what is shown**. A visual edit is justified only where there is a gap between them. Every cue must name its gap in `gap:`. If you can't name one honestly, there is no cue.

| `gap` | Meaning | Right tools |
|---|---|---|
| `said-not-shown` | Narration describes something invisible: architecture, data flow, a process | `flow-diagram`, `step-list`, `callout` |
| `shown-not-findable` | It's on screen, but small or lost among other content | `zoom`, `code-focus`, `highlight-region`, `callout` |
| `said-once-then-gone` | A term or list the viewer must keep in mind while the video continues | `term-definition`, `step-list` |
| `relationship-not-visible` | Before/after, cause/effect, A vs B | `comparison`, `flow-diagram` |

Every cue must also serve one of the video's learning objectives (`objective:`). A cue that is correct but beside the point is rejected.

**The deletion test.** Imagine the video without the cue. If a viewer would understand just as well, the cue goes. This is the critic's main question.

## 2. Design rules

| Principle | Rule | Common violation |
|---|---|---|
| **Coherence** | Nothing decorative. No animated logos, emoji, confetti, or motion for "energy". | A flourish on the title |
| **Signalling** | Guide attention to what matters. Prefer subtraction (dim the rest: `code-focus`) and magnification (`zoom`) over adding more on top. | A callout box over already-busy code |
| **Redundancy** | Never put on screen the sentence being spoken. Show the *structure* of the idea (the term and a 5-word gloss, the three nodes), not a transcript. | A lower third repeating the narration word for word |
| **Temporal contiguity** | The visual appears on the exact *word* it relates to. Use word timestamps from `transcript.json`, not segment starts. Start the cue 0.1–0.3s before the word, so it has finished entering when the word lands. | A diagram that appears a sentence late |
| **Spatial contiguity** | Labels sit next to what they describe. Callouts are anchored to the element (`anchor`), never parked in a corner. | "See the highlighted line" with the label across the screen |
| **Split attention** | Never animate while the viewer is reading code or watching someone type. One focus at a time: cues never overlap. | A diagram popping up mid-keystroke |
| **Segmenting** | Break multi-step processes into steps that reveal as they are spoken (`at:` on each step or node). | A 6-step list appearing all at once |
| **Pre-training** | If a term is used repeatedly and is new to the audience, define it at its *first* mention, not later. | Defining "TTL" after it's been used five times |

## 3. Motion and timing

- Motion must mean something: appearing means "new", direction shows flow, a single pulse means "look here". Nothing loops.
- The templates' motion vocabulary is fixed (`templates/motion.js`): ~300ms entrances, one easing family, no bounce or elastic. Don't fight it.
- **Reading time:** text stays up for at least `1s + 0.3s × words` (enforced). Longer is fine while the narration is still about it; take the cue down when the narration moves on.
- **Frequency** follows the gaps, not the clock. `rules.yaml` sets ceilings (per minute, minimum spacing), not targets.
- Zooms ease in over 0.4s, hold while the thing is discussed (≥ 2s), and ease out. Don't zoom on something that's about to scroll or change.
- **Check whether the recording already zooms.** Screen recorders like Screen Studio add automatic cursor-follow zooms. Look at consecutive frames for sudden changes of scale. Never stack a `zoom` on footage that is already punched in, or during the recorder's own zoom transitions. Where the recording already magnifies the thing being discussed, the gap is already closed.

## 4. Accuracy

Nothing loses a developer audience faster than a typo in a technical term or a number nobody said.

- **Nothing new.** Overlays restate or structure what was said or shown. They never introduce a fact, a number, a claim or a recommendation. Numbers are checked mechanically against the transcript and OCR.
- **Spelling.** Every technical term on screen must match `GLOSSARY.md`, and the on-screen text of the video itself (OCR), before the transcript. Whisper mishears jargon; the screen doesn't.
- **Code is quoted exactly** as it appears on screen, never retyped from the narration.
- If the presenter says something wrong, don't "fix" it with an overlay. Flag it in the report for the human.

## 5. Readability

- Text sits on solid panels (`theme.css`), so contrast never depends on the video underneath.
- Minimum type size: `layout.min_font_px` design pixels. That's readable on a phone.
- Keep the bottom `layout.caption_zone` of the frame clear for captions (enforced for anchors, and checked on the rendered layout).
- Never cover what the viewer needs to see: the code being discussed, the terminal output, the presenter's face. Check the grid frames for a clear area before choosing an anchor or panel position.
- Meaning is never carried by colour alone.

## 5a. Captions

- **Every edited video gets captions**, burned in (`captions.burn`, on by default), plus `captions.srt` / `captions.vtt` sidecars for YouTube and players.
- **Only from an accurate transcript.** Captions repeat the narration word for word, so a wrong word is an accuracy failure in front of every viewer. The validator refuses to burn in captions from a low-accuracy transcript (e.g. the PocketSphinx fallback). Get a Whisper transcript instead.
- **Spelling** follows `GLOSSARY.md` (corrections are applied to the transcript automatically). Add product names to the glossary before transcribing.
- **Placement:** bottom centre, inside the caption zone, on a dark box. If a webcam or anything else important sits in the caption band, set `captions.avoid: {x, y, w, h}` (design px) and the captions centre in the space that's left.
- Overlays never enter the caption zone, so captions and animations never collide.

## 6. Cutting rules

Every video gets a **tightening pass**: dead air is cut, long pauses are shortened, false starts are removed. What stays conservative is cutting **content**: when a cut might remove information, keep the footage.

**May be cut** (`kind:`):
- `dead-air`: silence with nothing changing on screen, including the lead-in before the first word and the tail after the sign-off. Leave ~0.3–0.5s either side so the pacing breathes. Pauses over ~1.5s mid-video are shortened to ~0.5s unless they're reading time.
- `false-start`: the presenter restarts the same point. Cut the abandoned attempt and keep the clean one.
- `filler`: throat-clearing, "um, so, let me just…" that carries nothing.
- `wait`: installs, builds, page loads. **Shorten, don't remove**: keep enough that the viewer knows time passed.

**Never cut:**
- Anything that carries information, even if it's said clumsily.
- **The reading time in a pause while code, a diagram or output is on screen.** Keep enough to read what's there (about `1s + 0.3s × words` of the key text, typically 2–3s), and trim the rest of a long pause.
- Deliberate pauses for emphasis.
- Steps that make the video reproducible: a command the viewer must type, a setting they must change, even if it's boring.
- Anything a later part of the video refers back to ("like we saw earlier").

A cut must not split a word or a sentence. Put boundaries in silence, using word timestamps.

## 7. Choosing a template

| If… | Use | Not |
|---|---|---|
| Small text is the problem | `zoom` | a callout pointing at text nobody can read |
| One area among many is being discussed | `code-focus` (for code), `highlight-region` (for UI) | a zoom that hides the context the viewer needs |
| A specific element needs a name | `callout`, anchored to it | a floating label |
| A new term will matter later | `term-definition` at its first mention | a definition that repeats the narration |
| A process has ordered steps the viewer follows along | `step-list`, revealed step by step | all steps at once |
| An invisible system is described | `flow-diagram`, nodes on their words | a paragraph of text |
| Two states are contrasted | `comparison` | an animated counter (that's decoration) |

## 8. Worked judgments

- ✅ Narration: "the request hits the edge first, and only misses go to the origin". The screen shows code. → `flow-diagram` (said-not-shown), nodes timed to "edge" and "origin".
- ❌ The same flow when the screen *already shows* an architecture diagram → rejected by **coherence**. At most, `highlight-region` on the part being discussed.
- ❌ Lower third reading "Now we'll deploy the worker" while the presenter says exactly that → rejected by **redundancy**.
- ✅ The presenter types a 40-character command at 1080p in a 14px terminal font → `zoom` on the terminal line (shown-not-findable) *after* typing finishes, not during.
- ❌ A callout "Fast!" on a benchmark → rejected by **nothing-new** (not a fact from the video) and **coherence**.
- ❌ Cutting a 4s pause while the finished config file is on screen → rejected. It's reading time.
- ✅ Cutting "So what we're— actually, let me start over. So what we're going to do…" down to the second attempt → `false-start`.

## 9. What the report owes the reviewer

The human reviewer should be able to judge the agents' judgment, not just the output. So the report lists every edit with its gap, objective and rationale, and every **rejected** candidate with the rule that rejected it. Rejections are part of the work; record them honestly.
