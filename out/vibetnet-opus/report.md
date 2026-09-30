# Edit report: vibetnet.mp4

> ⚠️ **Transcript quality:** PocketSphinx fallback: expect many wrong words. Trust on-screen text (frames, OCR) over this transcript; use it mainly for timing.

**02:37.5 → 02:35.8** (1.7s removed) · 0 visual edit(s) · 1 cut(s) · 11 candidate(s) rejected

## Learning objectives

What the agents understood this video to teach. Every edit serves one of these.

1. Know what Vibenet is and how to connect to it: an ephemeral Base developer network for testing in-flight features, with Chain ID, RPC URL, Explorer and Faucet
2. Know which demos Vibenet offers and where to find them: Accounts, Tokens (B20) and Validity Transactions
3. Know that Validity Transactions are coming soon in Base Cobalt, and that viewers are invited to test and report what breaks

## Visual edits

_None. The video already teaches clearly without additions._

## Cuts

| id | source range | length | kind | why |
|---|---|---|---|---|
| cut-1 | 02:35.8–02:37.5 | 1.7s | dead-air | Tail after the sign-off: last word ends 155.43 and the wave is done by 155.5; from 155.8 the presenter leans in, blurred, to stop the recorder. No speech, nothing new on screen. 0.37s kept after the last word. Critic: silencedetect -35 dB confirms silence 155.37 to end; at -50 dB only faint rustle/clicks (155.67-155.72, 156.01-156.37), no speech. Frames 155.8-157.3 show only the cursor heading off and the presenter leaning in; kept. |

## Rejected candidates

Ideas the agents considered and dropped, and the rule that dropped them.

| id | kind | idea | rejected by |
|---|---|---|---|
| cue-1 | cue | 5s zoom at 01:06.3 on the Connect to Vibenet panel (Chain ID, RPC URL, Explorer), region {x:1150, y:345, w:365, h:128} | temporal contiguity / deletion test: no on-screen evidence ties 66.3s to the panel (cursor parked on the tagline 22-92s, nothing moves); ASR context 'behaves differently ... chains ... pc responses gas' reads as how the network behaves, not how to connect. The values are never spoken and nothing is configured in the video, so a zoom at an arbitrary moment pulls the eye away from the narration and drops the webcam face for 5s. A gentler region that keeps the bubble (about 1.47x) only lifts the text from ~14 to ~21 design px, still not worth an unanchored motion. When unsure, reject. |
| cand-2 | cue | Zoom or highlight on the tagline "Vibenet is an ephemeral Base developer network..." at 00:22 | deletion test: the tagline is ~27 design px (the largest body text on the page) and the presenter's cursor already points at it for 70s; signalling is already there |
| cand-3 | cue | term-definition for "ephemeral" / "Vibenet" | redundancy: the page defines Vibenet on screen in one sentence; ephemeral is never confirmed as spoken or reused |
| cand-4 | cue | highlight-region or zoom on "Coming soon in Base Cobalt" at ASR "cobalt" 131.87 | coherence / never stack: the recording's own auto-zoom magnified exactly this line at 128-130.7, one second earlier; a second emphasis adds nothing |
| cand-5 | cue | flow-diagram of the Validity Transactions mechanism (sign, pending, sequencer checks conditions, include or expire) | nothing new: the flow is inferred from page copy; the narration can't be verified to describe it, and the page already shows the description and six feature cards |
| cand-6 | cue | step-list of the three demos (Accounts, Tokens, Validity Transactions) during the 95-116s tour | coherence: the three cards with their titles are on screen and hovered one by one; no clear area without covering cards or webcam |
| cand-7 | cue | zoom on the Tokens feature grid (11 design px descriptions) at 122-125 | never stack / split attention: the recording auto-zoomed this grid at 116.3-119.8, and the page is scrolling and about to navigate Back at 125.6 |
| cand-8 | cut | Cut the near-silent run 132.5-139.5 on the Validity page | never cut reading time: the Validity page (description plus six feature cards) has just unzoomed at 130.8 and this is the viewer's only unhurried look at it; speech can't be verified either way, so keep |
| cand-9 | cut | Cut the 1.8s pause at 48.97-50.77 and the 1.3s pause at 18.2-19.5 | when in doubt keep: silencedetect did not confirm 48.97-50.77 as silence (low-level sound), and both are mid-explanation breaths that may be deliberate |
| cand-10 | cut | Trim the 1.4s silent lead-in at 0-1.4 | deletion test: trimming ~1s of opening gains nothing and risks a clipped first word |
| cand-11 | cut | Cut ASR repetitions ("i've i've" 27.7, "all have all have" 89.0, "actually actually" 144.3, "it's it's" 149.6) as false starts | never cut what can't be confirmed: PocketSphinx output is unreliable, so these may not be repetitions at all |

## Checks

✓ Duration, resolution, audio and layout checks passed.

## Giving notes

Reply with notes by id and the agents will revise and re-render, for example:

- `drop cue-3`: remove an edit
- `restore cut-1`: put removed footage back
- `cue-2 is too early`: adjust timing
- `cue-4 should say "…"`: change the wording

Decisions are logged in `review.yaml` and feed the quality metrics (`npm run metrics`).
