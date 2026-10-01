# Storyboard: Vibenet walkthrough (`videos/vibetnet.mp4`)

The plan of record for this video. Nine visual beats, four cuts. Beats marked **ESTIMATE** are timed by guess (no transcript yet); the rest are locked to screen events. Rendered edit: `out/vibenet/` (PR #13).

## The video

2:37, presenter in a webcam bubble bottom-right, walking through the Vibenet overview page. Three parts: ~70s talking over a static page (0:22–1:32, cursor resting on "Vibenet"), a tour of the demo cards and the Tokens page (1:32–2:05), the Validity Transactions page and the call to action (2:08–2:34). The recorder auto-zooms at 1:56–2:00 and 2:06–2:11; we never stack on those.

The static 70 seconds needs the most help. The Validity page gets the most valuable animation.

## Beats

| # | Time | On screen | Animation | Why |
|---|---|---|---|---|
| 1 | 0:01–0:05 | Overview, nothing yet | Lower-third title: **Vibenet**, "An ephemeral Base developer network for testing in-flight features" | Orients the viewer before the talking starts |
| 2 | 0:35–0:44 **ESTIMATE** | Static overview | Step-list over the Connect panel: Chain ID `84538453` · RPC `rpc.vibes.base.org` · Test funds: Faucet | The one thing a developer will copy, and it's 14 px text |
| 3 | 1:00–1:08 **ESTIMATE** | Static overview | Flow diagram, over the browser chrome: **In-flight feature → Test on Vibenet → Ships on Base** | The mental model the page is about; never drawn. *Confirm the story against the narration* |
| 4 | 1:46.5–1:50 | Cursor on the Accounts card | Callout anchored to the bullet: **200 ms blocks** | The most striking fact on the page, in 14 px grey |
| 5 | 1:52.8–1:56.2 | Cursor on the Tokens card | Term card: **B20**, "Base's enshrined, ERC-20-compatible token standard" | The term the next page is built on; ends before the recorder's zoom |
| 6 | 2:00.2–2:01.8 | Tokens page, scrolled to "Create your first token" | Outline on the **Create Token** button | The action viewers are invited to take |
| 8 | 2:11.5–2:13.5 | Validity page, just unzoomed | Outline on "Coming soon in **Base Cobalt**" | 12 px text, said at that moment |
| 7 | 2:13.5–2:21.5 | Validity page, quiet stretch | Vertical flow diagram between the description and the grid: **Sign tx + conditions → Sequencer checks them → Included only while valid** | The hardest concept in the video, explained on the page in one sentence. Fills the silence with a picture |
| 9 | 2:24–2:32 **ESTIMATE** | Static Validity page, the ask | Card: **Try it, tell us what breaks** / "Open Demo → run it → report what you hit" | The CTA is spoken but never shown. *Add the feedback channel once confirmed* |

Order of 7 and 8 is deliberate: the Cobalt outline first, then the diagram.

## Cuts

| | Range | What goes |
|---|---|---|
| cut-1 | 0:00–0:01.0 | Silent lead-in |
| cut-2 | 0:18.5–0:19.2 | Pause on a static screen |
| cut-3 | 0:49.45–0:50.15 | Pause on a static screen |
| cut-4 | 2:35.8–end | Reaching to stop the recorder |

The 2:13–2:19 silence is kept: beat 7 plays there.

## Not done (yet)

- **Captions**: need a transcript. `captions.avoid` is already set for the webcam.
- **Timings for beats 2, 3, 9**: lock to the words once we have a transcript, or from the presenter's memory of what's said when.

## Considered and left out

- Zoom on the tagline (largest text on the page; cursor already points at it).
- Zoom on the Tokens feature grid (the recorder already zooms there).
- Cutting the Validity-page silence (it's now reading time for beat 7).

## Before publishing

Internal browser tabs and bookmarks are visible at the top of the frame throughout. The file is named `vibetnet`; the product is **Vibenet**.
