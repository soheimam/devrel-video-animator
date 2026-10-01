# Storyboard: Vibenet walkthrough (`videos/vibetnet.mp4`)

The plan of record for this video. Round 1 (PR #17): thirteen beats and four cuts, timed to the transcript. Rendered edit: `out/vibenet/`.

## The video

2:37, presenter in a webcam bubble bottom-right, walking through the Vibenet overview page. Three parts: ~70s talking over a static page (0:22–1:32, cursor resting on "Vibenet"), a tour of the demo cards and the Tokens page (1:32–2:05), the Validity Transactions page and the call to action (2:08–2:34). The recorder auto-zooms at 1:56–2:00 and 2:06–2:11; we never stack on those.

The static 70 seconds needs the most help. The Validity page gets the most valuable animation.

## Beats (round 1: timed to the narration)

| # | Time | She says | Animation | Why |
|---|---|---|---|---|
| 1 | 0:04–0:09 | "Base hard forks change how the chain works… how early can you test" | Card: **Base hard forks** / "What changes for your app, and how early you can test" | The video's framing, as she states it |
| 2 | 0:26–0:31 | "Vibenet is Base's experimental preview network" | Card: **Vibenet** / "Base's experimental preview network" | The definition, at the moment it's given |
| 3 | 0:31–0:39 | "go live here first… weeks before they reach Sepolia or Mainnet" | Flow, over the browser chrome: **Vibenet → Sepolia → Mainnet**, nodes on the words | The order she describes, never drawn |
| 4 | 0:40–0:48 | "200 ms blocks already running on Vibenet today, while Sepolia is planned for later in October" | Comparison: **Vibenet** 200 ms blocks: live today · **Sepolia** 200 ms blocks: later in October | Her example is a contrast |
| 5 | 0:55–1:04 | "point it at Vibenet and run your normal flows" | Step-list **Point your app at Vibenet**: Chain ID · RPC · Faucet | The values you need, 14 px on the page |
| 6 | 1:06–1:14 | "look for timing assumptions, RPC responses, gaps or even events" | Step-list **Look for**, one line per item | A spoken checklist over a static screen |
| 7 | 1:45–1:49 | "learn about EIP-8130… click on Accounts" | Callout **EIP-8130 · Accounts** on the Accounts card | Ties the EIP to the card she points at |
| 8 | 1:53–1:56 | "if you are working with B20" | Card: **B20** / "Base's enshrined, ERC-20-compatible token standard" | Named, never defined aloud |
| 9 | 2:00–2:02 | "deploy test tokens for B20 directly on Vibenet" | Outline on **Create Token** | The button for what she says you can do |
| 10 | 2:11–2:13 | "going live on Cobalt" | Outline on "Coming soon in **Base Cobalt**" | 12 px text, said at that moment |
| 11 | 2:13–2:19 | (pause) | Vertical flow: **Sign tx + conditions → Sequencer checks them → Included only while valid** | Validity transactions named, not explained |
| 12 | 2:21–2:29 | "tell us in our Base Discord: your transaction hash, what you expected, the exact error" | Step-list **Hit something? Base Discord**, lines on the words | The feedback channel and checklist, spoken once |
| 13 | 2:30–2:35 | "test early, tell us what breaks, be ready for day one" | Card: **Test early. Tell us what breaks.** / "Be ready for day one" | Sign-off |

Captions are burned in throughout, kept clear of the webcam.

## Cuts

| | Range | What goes |
|---|---|---|
| cut-1 | 0:00–0:00.6 | Silent lead-in |
| cut-2 | 0:47.8–0:50.0 | 3.3s pause after "later in October", kept to ~1s |
| cut-3 | 1:15.4–1:18.7 | 4.3s thinking pause mid-sentence ("how does it… work") |
| cut-4 | 2:35.8–end | Reaching to stop the recorder |

The 2:12–2:19 pause is kept: beat 11 plays there.

## Known limits of round 1

- Word times are spread evenly inside each transcript segment (±1s). The word-level `transcript.json` from ingest will tighten them.
- Captions have no punctuation for the same reason.

## Considered and left out

- Zoom on the tagline (largest text on the page; cursor already points at it).
- Zoom on the Tokens feature grid (the recorder already zooms there).
- Cutting the Validity-page silence (it's now reading time for beat 7).

## Before publishing

Internal browser tabs and bookmarks are visible at the top of the frame throughout. The file is named `vibetnet`; the product is **Vibenet**.
