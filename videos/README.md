# videos/

Upload a recording here and the agents edit it for you: animations where they help, captions, dead air cut. You get the finished MP4 back on the pull request.

## How to get a video edited

1. **Open a pull request** from a branch in this repository (any name; the title is a fine name for the video).
2. **Drag the MP4 into the PR description.** That's it. GitHub attaches it; the workflow downloads it.
   Or, if you prefer git: add it as `videos/<topic-name>.mp4` and push.
3. **Wait about ten minutes.** One comment appears with **Download edited.mp4**, a GIF of every animation with the three moments that matter, the cuts, and a checkbox per item.
4. **Give notes by replying on the PR**, mentioning `@claude`:

   > @claude drop beat-3, beat-6 a second later, beat-9 should say "Create a token", restore cut-1

   The video is re-rendered and the same comment updates in place. Repeat until it's right.
5. **Download and publish.** Merge the PR to keep the edit list and storyboard; close it if you don't need them.

Nothing to install. No keys. Only people with write access to this repository can start a run; pull requests from forks are ignored.

## Before you upload

- **Format:** MP4 (or MOV), at the resolution you'll publish. Landscape and vertical both work. Up to 15 minutes; up to 100 MB as an attachment.
- **Name it after the topic:** `edge-caching-intro.mp4`, not `Screen Recording 2026-09-30.mp4`. The name becomes the output folder.
- **A line of context helps.** Audience, what must stay intact, anything to avoid. Put it in the PR description under the video.
- **It's public.** This repository is public, so the recording is visible as soon as it's attached. Nothing confidential on screen, and nothing embargoed.

## Where things end up

| | |
|---|---|
| Edited video, captions, GIFs | Assets on the [`renders` release](../../releases/tag/renders), named `<video>--edited.mp4` and so on. Replaced on every round. |
| Edit list, report, transcript, storyboard | `out/<video>/` and `storyboards/<video>.md` on the PR branch (text only) |
| Source recording | Not committed. `videos/<video>.yaml` records where it came from so a re-run can fetch it. |

## Running it yourself

```bash
npm install && cp .env.example .env     # one transcription key
node scripts/ingest.mjs videos/<file>.mp4
# then in Claude Code: "Animate videos/<file>.mp4"
npm run render -- out/<name>
```
