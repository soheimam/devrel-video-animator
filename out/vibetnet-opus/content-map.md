# Content map: vibetnet.mp4

Source: 1108x720, 60 fps, 157.461 s. Design space 1662x1080 (design px = source px x 1.5). All boxes below are design px, measured on `.grid.jpg` frames (grid every 240 design px).

**Confidence caveat.** The transcript is a PocketSphinx fallback and almost every word is wrong. Timing (speech vs. silence) is reliable. Content claims come from the screen and cursor. Anything attributed to the narration is marked *(ASR, unverified)*. The objectives are inferred from screen time and cursor, not from what was said, so confidence in them is limited.

## 1. Objectives

1. **Know what Vibenet is and how to connect to it.** Vibenet is "an ephemeral Base developer network for testing in-flight features", with Chain ID, RPC URL, Explorer and Faucet shown. Evidence: the cursor sits on the word "Vibenet" in the tagline for about 70 s (00:22–01:32). This is the longest stretch in the video.
2. **Know which demos Vibenet offers and where to find them.** The demos are Accounts, Tokens (B20) and Validity Transactions. Evidence: 01:35–01:56 is spent scrolling and hovering over the three Demo cards. The presenter then opens Tokens (01:57) and Validity Transactions (02:08).
3. **Know that Validity Transactions are "coming soon in Base Cobalt", and that viewers are invited to test and report what breaks.** Evidence: the video ends on the Validity Transactions page (02:11–02:37). "cobalt" is at 131.87 and "tell us what breaks" at 151.60–152.62 *(ASR, plausible)*.

## 2. Audience

- Developers who build on Base and know EVM concepts: account abstraction, EOA vs smart accounts, ERC-20, gas, RPC URL, chain ID, sequencer, onchain conditions. None of these is defined on screen, and nothing in the narration audibly defines them.
- Assumed to know Base's upgrade naming ("Base Cobalt") and to be comfortable adding a custom network with the RPC URL and chain ID.
- The tone is a casual announcement or walkthrough, not a step-by-step tutorial. Nothing is built or executed: "Create Token" and "Open Demo" are never clicked.

## 3. Segments

| Time | Purpose | On screen |
|---|---|---|
| 00:00.0–00:01.4 | Silent open (no words before 1.40) | Browser, Vibenet Overview at top. Face bubble, presenter looking down. Cursor idle at (780,645). |
| 00:01.4–00:21.0 | Intro | Same static Overview. Face. Cursor idle. |
| 00:21.0–00:22.0 | Brief hover | Cursor crosses the Accounts card (card highlights, status bar shows `/vibenet/demos/account`), then moves to the tagline. |
| 00:22.0–01:32.9 | Concept: what Vibenet is (longest block, about 71 s) | Static Overview. Cursor parked on "Vibenet" in the tagline. The screen does not change. Face bubble is the only motion. |
| 01:32.9–01:56.0 | Tour of the Demos section | Overview scrolls down/up/down (95–103). Hovers over Tokens (101), Validity (103), Accounts (105–111), then the Tokens bullets (113–116). |
| 01:56.0–02:05.5 | Tokens page (`/vibenet/demos/b20`) | Click on the Tokens card. **Recording auto-zooms 116.3–119.8** into the Tokens feature grid. Then unzoomed: scroll to "Create your first token" (120–121), scroll back to top (122–125). |
| 02:05.5–02:11.0 | Navigate to Validity Transactions | **Recording auto-zooms 125.6–130.7.** Browser Back button (126.0) → Overview → click on "Validity Transactions" title (127.5) → Validity page (128.0). |
| 02:11.0–02:19.5 | Validity page, near-silent | `/vibenet/demos/validity`, unzoomed. Presenter looking down. Cursor moves from (565,735) to the Conditional Swaps card by 137. |
| 02:19.5–02:34.6 | Closing / call to action | Static Validity page. Cursor parked at the left edge of "Conditional Swaps". Presenter looks down a lot (141–151), then at camera (153). |
| 02:34.6–02:37.5 | Sign-off and tail | "thanks guys" at 154.44. Presenter waves (~155.0), then leans in to stop the recording (156.5, face large and blurred). Silence 155.4–157.5. |

## 4. Terms

No term here is in `editorial/GLOSSARY.md`. Spellings come from the screen (frames), because OCR is noisy. The ASR did not recognise any product name reliably. "First seen" is the frame time. "First heard" is given only where an ASR word plausibly matches.

| Term (correct spelling) | First seen | First heard (ASR word, time) | Defined? | Notes |
|---|---|---|---|---|
| Vibenet | 00:00 (tab, sidebar, tagline) | not recognised. Possibly "titan" 91.85 in "test anything on titan" (speculative) | Yes, on screen: "an ephemeral Base developer network for testing in-flight features" | The file name "vibetnet" is a misspelling. The product is **Vibenet**. |
| Base | 00:00 | "based" 4.97, "base" 6.70 | No | |
| ephemeral | 00:00 (tagline) | none | No | |
| EIP-8130: Accounts | 00:00 (top banner "New! EIP-8130: Accounts · Test on Vibenet") | none | No | |
| Chain ID `84538453` | 00:00 (Connect panel) | none | No | Tiny text (see Landmarks). |
| RPC URL `https://rpc.vibes.base.org` | 00:00 | none | No | Host says "vibes", not "vibenet". See Accuracy notes. |
| Explorer `/vibenet/explorer`, Faucet | 00:00 | none | No | Sidebar and Connect panel. |
| account abstraction, Smart & EOA accounts, K1 / P-256 / passkey signers | 00:00 (Accounts card) | none | No | Card copy: "Create portable account-abstraction accounts from in-browser keys…" |
| 200 ms block | 00:00 (Accounts bullet "Transactions land in the next 200 ms block") | none | No | |
| B20 | 01:37 (Tokens card, first scroll) | none | On screen: "Base's enshrined, ERC-20-compatible token standard" | OCR misreads it as "820"/"620". |
| ERC-20 | 01:37 | none | No | |
| ERC-8168 (token payment) | 01:37 (Tokens bullet "Pay gas with your own stablecoin (ERC-8168 token payment)") | none | No | OCR also gives "ERC-8148" (wrong). The frame reads 8168. |
| Transaction memos, bytes32, Asset announcements, Policy-Gated Transfers, Roles & Permissions, Asset & Stablecoin | 01:43–01:57 | "transactions" 59.21 (context unknown) | Short descriptions on the Tokens page cards | |
| precompile | 01:57 (ERC-20 Compatible card: "Runs as a precompile with permit") | none | No | |
| Validity Transactions | 01:37 (Overview card, first scroll) | "transaction" 128.33 (said while the title is being clicked at 127.5) | On screen: "Submit transactions with onchain conditions, then let the sequencer include them only while those conditions are valid." | |
| sequencer, onchain | 01:37 | none | On-screen copy only | |
| Base Cobalt | 02:08 ("Coming soon in Base Cobalt") | "cobalt" 131.87–132.50 | No | Also a browser tab "Base Cobalt GTM". |
| State-Aware Inclusion, Submit Before It Is Valid, Storage Conditions, Block Bounds & Expiry, Condition-Aware Ordering, No Keeper Required | 02:08 | none | One-line card descriptions (tiny) | |
| Race the Agent, Conditional Swaps | 02:08 | none | Card descriptions | Demo names. Never opened. |

Mis-hearings noticed (examples, not complete): "bases experimental" 28.42–29.67 is probably "Base's experimental"; "titan" 91.85 is possibly "Vibenet"; "cobalt" 131.87 is probably correct. Every other word should be treated as unreliable.

## 5. Sequences

Screen walk-through (times from frames; ASR anchors in brackets):

1. Overview, intro. Cursor settles on "Vibenet" in the tagline: 22.0.
2. Topic shift. Cursor leaves the tagline between 91.0 and 93.0 [ASR "another" 92.92].
3. Page scrolls down to the Demos cards: 95.0 (small scroll), 97.0 (Demos near top).
4. Scroll back to top: 99.0. Hover over the Tokens card, status bar `/demos/b20`: 101.0.
5. Scroll down again (Demos at top): 103.0. Hover near the Validity Transactions card, status bar `/demos/validity`.
6. Hover over the Accounts card, status bar `/demos/account`: 105.0–111.0.
7. Hover over the Tokens card's first bullet ("Pay gas with your own stablecoin…"): 113.0–116.0.
8. Click Tokens. Auto-zoom starts at 116.3 (116.5 zoomed on the Tokens card). Tokens page visible (zoomed) by 117.5.
9. Zoomed pass over the feature grid (Roles & Permissions, Asset Announcements, Asset & Stablecoin): 117.5–119.5. Zoom out complete by 120.0.
10. Tokens page scrolled to "Create your first token" / "Create Token": 120.0–121.0. Back to top: 122.0.
11. Browser Back button: 126.0 (zoomed). Overview again: 126.5.
12. Click the "Validity Transactions" title (hand cursor): 127.5 [ASR "transaction" 128.33]. Validity page loaded: 128.0.
13. Zoomed on "Coming soon in Base Cobalt" / Demos: 128.0–130.0 [ASR "cobalt" 131.87]. Unzoomed by 130.8.
14. Cursor moves to the Conditional Swaps card and stays there: 137.0–157.5.
15. Call to action [ASR "tell us what breaks" 151.60–152.62]. Sign-off [ASR "thanks" 154.44, "guys" 154.64]. Wave at about 155.0.

## 6. Invisible ideas

The narration cannot be quoted reliably. The spans below are where speech clearly covers something the screen does not show. Quotes are verbatim ASR output and **not** the real words.

- **00:22–01:33: the whole Vibenet explanation is on a static screen.** About 71 s of speech while only the tagline is visible. ASR fragments suggest it covers what Base is testing and how the network behaves: "these bases experimental" (28.42–29.67), "contracts any transactions" (58.36–60.11), "behaves differently … chains … gas" (61.9–67.8), "everything you need to test anything on titan" (90.27–91.85). No diagram, flow or state is shown for any of this.
- **Validity Transactions mechanism (02:08–02:37).** The page text describes a flow: sign → pending → sequencer evaluates onchain conditions → include or expire. It is never demonstrated ("Open Demo" is not clicked). ASR at 126.39–132.50: "envy also have a feeling each transaction see as well which is going right on cobalt" (probably "we also have validity transactions as well, which is going live on Cobalt"; unverified).
- **Tokens / B20 (01:56–02:05).** Features are shown only as card text. Nothing is created. ASR 119.8–125.2: "it has to live in sydney am from the full be twenty directly on that guy" ("be twenty" possibly "B20"; unverified).
- **Feedback loop (02:19–02:34).** ASR: "tell us game at base" (141.45–142.31), "it's a test … tell us what breaks" (150.05–152.17). The feedback channel (where to report) is never shown on screen.

## 7. Screen landmarks

### Webcam bubble (never cover)
- **Normal size:** {x:1062, y:722, w:546, h:307}, visible 00:00–01:56.3, 01:59.8–02:05.6, 02:10.7–02:37.5. It covers the Tokens card's text on the unscrolled Overview, the right half of "Create your first token", and the Conditional Swaps description.
- **During auto-zoom** (116.3–119.8 and 125.6–130.7) it shrinks and moves: about {x:1200, y:795, w:411, h:240} (116.5) and {x:1227, y:812, w:381, h:218} (128–130).
- **Safe union for the whole video:** {x:1062, y:722, w:600, h:358} (to the bottom-right corner).

### Recording-level zooms and scrolls (baked into the source)
- Auto-zoom 1: starts between 116.0 and 116.5, fully out by 120.0 (mid-transition at 119.5). The browser chrome is off screen, so all landmark boxes differ during it.
- Auto-zoom 2: starts between 125.5 and 126.0, fully out by 130.8 (mid-transition at 130.5).
- Page scrolls: small at 95.0 (about 16 design px); down at 97.0; back to top at 99.0; down at 103.0 (stays until the click). Tokens page: scrolled down at 120.0–121.0, top at 122.0.
- Page changes: Overview → Tokens between 116.5 and 117.5. Tokens → Overview (Back) 126.0–126.5. Overview → Validity 127.5–128.0.

### Fixed chrome (unzoomed)
- macOS menu bar, tabs, URL bar, bookmarks and the "New! EIP-8130" banner: {x:0, y:0, w:1662, h:203}. **Tabs and bookmarks show internal names and URLs** (e.g. "Base Cobalt GTM", "github.cbhq.net", "CB-MCP", "CB Skills — Coinba…", "genai-adoption", "ClaudeDevs on X"). Too small to read on a phone, but legible at full size.
- Left sidebar (Vibenet nav: Overview/Faucet/Explorer; Upgrades/Docs/Status/Support/Blog): {x:0, y:225, w:263, h:833}.

### Overview, top of page (00:00–01:34, 01:39–01:41)
- Tagline "Vibenet is an ephemeral Base developer network for testing in-flight features.": {x:402, y:423, w:614, h:65}. At 95.0 it is shifted up about 16 px.
- "Vibenet" word (cursor target 22–92): {x:402, y:423, w:100, h:33}.
- Connect to Vibenet panel (Chain ID, RPC URL, Explorer): {x:1155, y:348, w:353, h:120}. **Values are about 14 design px, too small on a phone.**
- Demos heading: {x:404, y:582, w:68, h:24}.
- Accounts card: {x:405, y:653, w:555, h:330}. Bullets about 14 design px, **too small on a phone**.
- Tokens card: {x:983, y:653, w:548, h:330}, mostly hidden under the webcam.
- **Clear areas:** {x:1050, y:495, w:600, h:215} (right of Demos, above the webcam); {x:405, y:495, w:555, h:75} (between tagline and Demos, narrow). The cursor is not in either of these areas from 22 to 92.

### Overview, scrolled to Demos (01:43–01:56.3)
- Accounts card: {x:405, y:338, w:555, h:356}.
- Tokens card: {x:978, y:338, w:552, h:356}. Bullet "Pay gas with your own stablecoin (ERC-8168 token payment)": {x:1018, y:555, w:443, h:21}.
- Validity Transactions card: {x:405, y:738, w:555, h:312}.
- **Clear area:** none of useful size. The right column below the Tokens card is webcam, and the rest is card content.

### Tokens page `/vibenet/demos/b20` (unzoomed, top: 122.0–125.5)
- Title + description: {x:432, y:338, w:483, h:105}.
- Feature grid (6 cards): {x:985, y:342, w:515, h:296}. Card descriptions about 11 design px, **unreadable on a phone**.
- Specification / B20 Standard buttons: {x:432, y:603, w:300, h:27}.
- Create Token button: {x:900, y:972, w:135, h:36}.
- **Clear area:** {x:432, y:450, w:500, h:140} (between description and buttons).

### Validity Transactions page `/vibenet/demos/validity` (unzoomed 130.8–157.5)
- Title + description: {x:432, y:333, w:476, h:150}.
- "Coming soon in Base Cobalt": {x:432, y:468, w:183, h:15}. **About 12 design px, unreadable on a phone.**
- Feature grid (6 cards): {x:985, y:342, w:515, h:341}. Titles about 14 px, descriptions about 11 px, **too small on a phone**.
- Demos heading: {x:404, y:785, w:70, h:24}.
- Race the Agent card: {x:428, y:862, w:315, h:165}. Open Demo button: {x:428, y:993, w:117, h:33}.
- Conditional Swaps card: {x:812, y:862, w:250, h:165} visible. The rest is under the webcam.
- **Clear area:** {x:432, y:503, w:520, h:200} (below "Coming soon", left of the grid). From 130.8 to 134 the cursor is inside it at about (565,735), on its lower edge.

### Cursor track (design px)
| Time | Position | Pointing at |
|---|---|---|
| 00:00–00:20 | (780,645) | idle, empty space above the Accounts card |
| 00:21 | (756,675) | Accounts card (hover state) |
| 00:22–01:31 | (420,465) | "Vibenet" in the tagline, static about 70 s |
| 01:33 | (480,450) | end of "Vibenet" |
| 01:35 | (773,548) | empty, page scroll starts |
| 01:37 | (1074,630) | Tokens card bullets |
| 01:39–01:40 | (918,585)–(923,615) | Demos area |
| 01:41 | (1008,780) | Tokens card (hover) |
| 01:43 | (858,789) | Validity Transactions card (hover) |
| 01:45–01:51 | (705–875, 450–696) | Accounts card description |
| 01:53–01:56 | (1092,552) | Tokens bullet "Pay gas with your own stablecoin" |
| 01:56.5–01:59.5 | zoomed | Tokens card → Tokens feature grid (Roles & Permissions, Asset Announcements, Asset & Stablecoin) |
| 02:00–02:01 | (900,660) | near "Create your first token" |
| 02:02–02:05 | (816,600) | near B20 Standard button |
| 02:06.0 | zoomed | browser Back button |
| 02:07.5 | zoomed | "Validity Transactions" title (hand cursor, click) |
| 02:08–02:10 | zoomed | "Demos" / Race the Agent |
| 02:10.8–02:14 | (565,735) | empty area above Demos (hand, then arrow) |
| 02:17–02:37.5 | (822,885) | left edge of the "Conditional Swaps" title, static about 20 s |

## 8. Pauses and restarts

| Span | Length | Source | On screen | Reading or dead air |
|---|---|---|---|---|
| 0.00–1.40 | 1.40 s | transcript (no words) | Overview, presenter looking down | Dead air (lead-in) |
| 18.20–19.50 | 1.30 s (below threshold) | transcript + silencedetect 18.17–19.51 | static Overview | dead air |
| 48.97–50.77 | 1.80 s | transcript only (silencedetect at -35 dB did not flag it, so there is low-level sound) | static Overview, cursor on "Vibenet", presenter looking down | dead air (nothing new on screen) |
| 125.23–126.39 | 1.16 s (below threshold) | both | cursor going to Back button, zoom starting | navigation |
| 132.50–134.54 | 2.04 s | transcript. silencedetect 132.47–134.35 | Validity page just unzoomed, hand cursor idle at (565,735), presenter looking down | could be reading time for the page, but the presenter is not addressing it |
| 134.61–136.80 | 2.19 s | transcript. silencedetect 135.21–136.82 | same page, cursor starts moving toward Conditional Swaps | dead air |
| 136.92–139.53 | 2.61 s | transcript. silencedetect 137.15–138.46 (1.31 s) | cursor parked on Conditional Swaps, presenter looking down | dead air |
| 155.43–157.46 | 2.03 s | both (silencedetect 155.37–157.46) | wave at ~155.0, leaning in to stop the recording at 156.5 | tail dead air |

- **Combined near-silent run 132.50–139.53 (about 7 s).** The only words in it are two ASR "the" tokens (134.54–134.61, 136.80–136.92), probably noise or breaths. The presenter is looking down in the webcam throughout.
- **Possible repetitions / false starts** (ASR, low confidence): "i've i've" 27.70–27.81; "all have all have" 89.04–90.02; "actually actually" 144.32–144.63; "it's it's" 149.55–150.05.
- **Presenter looks down (reading notes or a device)** at 00:00, 00:05, 00:30, 00:50–00:55, 01:10, 02:13–02:31, 02:36.5.
- **Long static-screen stretch:** 00:22–01:33 (about 71 s). The screen does not change and the cursor does not move.

## 9. Accuracy notes

- The RPC URL on screen is `https://rpc.vibes.base.org` ("vibes"), while the product is "Vibenet" and the explorer path is `/vibenet/explorer`. This may be correct, but a human should check it.
- The recording's file name is "vibetnet". The product is spelled "Vibenet" everywhere on screen.
- Validity Transactions is labelled "Coming soon in Base Cobalt", yet it is listed as a Vibenet demo with "Open Demo" buttons. If the narration presents it as live now, that conflicts with the page. ASR "going right on cobalt" (130.23–132.50) suggests the narration matches ("going live on Cobalt"). Unverified.
- Narration cannot be checked against the screen beyond this, because the transcript is unreliable. A human should listen to 00:22–01:33, where most spoken claims are made against a static screen.
- Internal or private material is visible in the browser chrome for the whole video: tab names ("Base Cobalt GTM", "Automating eval…"), bookmarks (github.cbhq.net, CB-MCP, CB Skills, genai-adoption), and the profile "Work". This is for human review.
