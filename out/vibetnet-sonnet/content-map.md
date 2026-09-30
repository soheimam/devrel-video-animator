# Content map: vibetnet.mp4

Source 1108x720, 60fps, 157.5s. Design frame ~1662x1080 (design px = frame px x 1.5). Transcript is PocketSphinx: timing only. All wording below comes from frames/OCR.

## 1. Objectives
1. Know what Vibenet is: an ephemeral Base developer network for testing in-flight features (on-screen: "Vibenet is an ephemeral Base developer network for testing in-flight features.").
2. Know the three demo areas the overview page offers: Accounts, Tokens, Validity Transactions.
3. See what the Tokens and Validity Transactions pages contain (B20 tokens; "Coming soon in Base Cobalt" for Validity).

## 2. Audience
Base/onchain developers. Assumes familiarity with account abstraction, ERC-20, and what a devnet is. Presenter is informal (demo with a wrap-up asking people to test and report what breaks; wording uncertain).

## 3. Segments
| Time | Purpose | On screen |
|---|---|---|
| 00:01-00:19 | intro, overview page | Vibenet Overview (browser, chain.base.org/vibenet), cursor idle near (520,430) frame px; webcam bottom-right |
| 00:19-01:30 | concept, walk through overview | same page, cursor parked on "Vibenet" headline from ~00:30 to ~01:30 |
| 01:30-01:47 | scroll to Demos | Demos cards: Accounts, Tokens, Validity Transactions (Accounts card hovered 01:47-01:50, Tokens hovered ~01:53-01:56) |
| 01:56-02:06 | Tokens page /demos/b20 | Tokens page. The SOURCE ITSELF has a screen-recorder auto zoom/pan here (frame 01:57.5 is punched in, 01:59.5 is mid-blur transition) |
| 02:06-02:39 | Validity Transactions page /demos/validity | Validity page, "Coming soon in Base Cobalt", six feature cards, Race the Agent / Conditional Swaps demos |
| 02:12-02:19 | silent stretch | unchanged Validity page, presenter looking down |
| 02:19-02:35 | wrap-up | same Validity page, presenter speaking to camera |

(Times in this table are mm:ss source time; page-change times estimated from frames at 5s spacing plus extras.)

## 4. Terms (spelling from screen)
Vibenet, Base, Base Cobalt, EIP-8130: Accounts (banner), B20 / "B20 Standard", ERC-20, ERC-8168 token payment, K1 / P-256 / passkey, "Smart & EOA accounts", bytes32, Validity Transactions, "No Keeper Required". Presenter's definitions unknown (transcript unusable); nothing is visibly defined off-screen that the page does not already say.

## 5. Sequences
Overview -> Demos -> Accounts -> Tokens -> Validity Transactions. Navigation is by the page itself; each page is on screen while discussed.

## 6. Invisible ideas
None identifiable. The transcript is too corrupted to tell whether any architecture or flow is described; nothing on screen suggests a missing diagram.

## 7. Screen landmarks (design px, x1.5 of frame px)
- Connect to Vibenet box (Chain ID, RPC URL, Explorer): {x:1158, y:352, w:350, h:118}, 00:00-01:40. Small text (about 12px at 1108 wide). The cursor never visits it.
- Tokens demo card on overview: {x:975, y:315, w:555, h:345}, visible ~01:47-01:56, cursor on it ~01:53-01:56; click follows, so page is about to change.
- Webcam bubble: {x:1065, y:723, w:543, h:306}, always. Never cover.
- Clear areas: overview page, center-left below headline about {x:400,y:520,w:600,h:150} (design) is empty but not needed.
- Browser page text is about 11-12px in frame terms: unreadable on a phone, for the entire video.

## 8. Pauses and restarts
- 00:18.17-00:19.51 (1.3s) silence, Overview static, no pointer movement. Short; not worth cutting.
- 02:12.47-02:18.46: near-silence ~6s (ffmpeg silencedetect at -35dB: 132.47-134.35, 135.21-136.82, 137.15-138.46; only a faint "the" at 134.5 and 136.8). Screen: Validity page, static except the cursor drifting (hand pointer at 132.6, arrow at 134.5 and 138.4); presenter looking down. Page full of unread-at-phone-size cards, so arguably reading time.
- 02:35.37-02:37.46: end silence, outro. Leave.
- 00:48.3-00:50.8 pause of 1.8s (per transcript), static page.

## 9. Accuracy notes
Cannot judge the narration (transcript unreliable). The page itself shows chain ID "84538453" (OCR noisy; frame reads 84538453).

## Addendum: source already has screen-recorder zooms
Frames 01:57.5, 01:59.5 and 02:10.0 are auto-punched-in by the recording tool (cursor-follow zoom, with a motion-blurred transition at 01:59.5). So small on-screen text is already being magnified by the source when the presenter navigates to a sub-page. Extra zooms from us would fight or stack on these. The Validity page starts around 02:08-02:10 (zoomed at 02:10.0, back to full at 02:12.6).
