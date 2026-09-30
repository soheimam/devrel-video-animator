# videos/

Upload your recordings here to have them edited.

## How to upload

**In the browser:** open this folder on GitHub → **Add file** → **Upload files** → drop in your MP4 → commit.

**From the command line:**

```bash
cp ~/Desktop/my-talk.mp4 videos/
git add videos/my-talk.mp4
git commit -m "Add my-talk recording"
git push
```

Then open Claude Code in this repo and say:

> Edit videos/my-talk.mp4

The edited video and its report appear in `out/my-talk/` (`edited.mp4`, `report.md`). Review both before publishing. You can reply with notes like "drop cue-3" or "restore cut-1".

## Before you upload

- **Format:** MP4, recorded at the resolution you'll publish (1080p is ideal). Landscape and vertical both work.
- **Name the file after the topic:** `edge-caching-intro.mp4`, not `Screen Recording 2026-09-30.mp4`. The name becomes the output folder name.
- **Size limits:** GitHub accepts files up to **25 MB** through the browser and **100 MB** through `git push`. For longer recordings, use [Git LFS](https://git-lfs.com) or share the file another way and put it in this folder locally.
- **Product names:** add any new product names or technical terms to [`editorial/GLOSSARY.md`](../editorial/GLOSSARY.md) first, so the transcript and on-screen text spell them correctly.
- **Nothing confidential:** anything committed here is visible to everyone with access to the repo, including API keys, customer data or internal dashboards on screen.
