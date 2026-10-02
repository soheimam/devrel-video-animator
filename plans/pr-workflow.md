# Plan: a video arrives as a PR, the agents do the rest

**Goal.** A Base DevRel engineer opens a PR that adds a recording. Agents on this repository transcribe it, suggest and render the animations, and post the result on the PR: GIFs to review, picks by comment, and the finished MP4 to download, all without leaving GitHub. Only people we name can start a run, even though the repository is public.

Today the same flow runs with a human (you) driving Claude Code from a session: upload, run ingest locally, push the transcript, ask the agent, review on the PR. This plan moves the driving into the repository so the uploader never needs a local setup.

## The shape

```
person        opens PR: adds videos/<name>.mp4 (+ optional videos/<name>.md with notes)
                 │
gate          author on the allowlist, PR from this repo (not a fork), label `animate` or `/animate` comment
                 │
job 1 ingest  transcribe (AI SDK, key from repo secrets) + frames → out/<name>/, pushed to the PR branch
                 │
job 2 suggest Claude Code runs the animate-video skill → edits.yaml, render, previews, report
              pushes out/<name>/ to the PR branch, posts the review comment (GIFs, strips, download link)
                 │
loop          person comments picks ("drop beat-3", "beat-4 at 1:10") → same gate → agent applies, re-renders, re-posts
                 │
done          person downloads edited.mp4 (and captions.srt) from the PR; merges to keep the edit list, or closes
```

Three design decisions carry everything else: where the media lives, how a run is allowed to start, and what runs the agent.

## 1. Where the media lives

**The problem is already here.** `.git` is 941 MB after two videos, because every round committed a new 30 MB MP4 and 40 MB of GIFs. A clone takes minutes and GitHub will start refusing pushes around 1–2 GB of history. Any PR-driven flow multiplies this by every video and every round.

**Decision: binaries never enter git history.**

| What | Where | Why |
|---|---|---|
| Source recording | **Git LFS** (`videos/*.mp4`) | The uploader's experience stays "drag the file into the PR". LFS keeps history small; the file lives in LFS storage. |
| `edited.mp4`, `preview/*.gif`, `preview/*.strip.jpg` | **GitHub Release assets** on a rolling `renders` release, named `<name>-<short sha>.mp4`, plus **workflow artifacts** for the run | Release assets give a permanent direct download URL that works in a PR comment and in the Vercel review page. Artifacts expire after 90 days, so they are the fallback, not the record. |
| `edits.yaml`, `report.md`, `captions.srt/.vtt`, `transcript.json`, `storyboards/*.md` | **Git**, on the PR branch | Small text. This is the edit, and it is what review and history should track. |

The review comment embeds GIFs from the release asset URLs, exactly as the PR descriptions do now, and links the MP4. `scripts/site.mjs` already builds the review page from `out/`; it would read the asset URLs from a small `out/<name>/assets.json` instead of copying files into `public/`.

Caveats to settle before building:
- LFS quota on the org plan (storage and monthly bandwidth). A 60 MB recording is pulled once per job run. If the org plan is tight, source recordings move to a bucket (Cloudflare R2 or S3) and the PR adds `videos/<name>.yaml` with the URL instead of the file. The scripts already resolve a recording by name under `videos/`; a manifest is a small extension of `sourceVideo()`.
- **A public repository publishes the recording the moment it is pushed.** LFS objects are fetchable by anyone who can read the repo. If recordings are embargoed until the video goes out, the source must live in private storage (bucket with signed URLs) and only the edit list be public. Decide this first; it changes the uploader's step from "drag a file" to "paste a link".
- History cleanup: the existing MP4s and GIFs should be rewritten out of history once (BFG or `git filter-repo`), on a day when nobody has open branches. Otherwise every Action checkout pays for the 941 MB forever (shallow clones help but LFS does not retro-fit).

## 2. Who may start a run

A public repo means anyone can open a PR that adds `videos/x.mp4`. The run costs money (transcription, model tokens, Actions minutes) and reads a repo secret, so it must not start on its own for strangers.

**Decision: three gates, all cheap, all in the workflow file.**

1. **Not a fork.** `github.event.pull_request.head.repo.full_name == github.repository`. Fork PRs never see secrets anyway; this makes the rule explicit and keeps `pull_request_target` out of the design entirely (it is the classic way to leak secrets).
2. **Author on the allowlist.** `.github/animators.txt`, one GitHub login per line, checked with a two-line shell step. Changing the list is a PR reviewed by a maintainer. (A GitHub team works too, but checking team membership needs a token with org scope; the file needs nothing.)
3. **An explicit go.** Either the PR carries the `animate` label (which only people with triage access can add) or someone on the allowlist comments `/animate`. This stops a run on every push of a work-in-progress PR, and it is the natural place for the picks loop: the same `/animate` comment, with picks in it, re-runs the agent.

The agent's inputs from the PR (title, notes file, comments) are untrusted text. The run uses a fixed prompt that points at the skill, and the Action's tool allowlist is limited to what the skill needs (`npm run render`, `node scripts/*.mjs`, `git add/commit/push` on the PR branch, the PR comment call). Nothing in a comment can widen that.

## 3. What runs the agent

**Decision: GitHub Actions + the Claude Code GitHub Action, in the repository.** It is where the gate, the secrets, the PR and the logs already are, and it keeps the project's rule: no server, no app.

Two jobs, so the expensive one only runs when the cheap one succeeds:

**`ingest`** (plain Node, no agent)
- `ubuntu-latest`, `actions/setup-node@v4` (Node 22), `apt-get install ffmpeg`, `npm ci`, Playwright Chromium from cache (`~/.cache/ms-playwright`, keyed on the Playwright version).
- `git lfs pull --include videos/<name>.mp4` for the one file the PR added (`git diff --name-only` against the base, filtered to `videos/*.mp4`).
- `node scripts/ingest.mjs videos/<name>.mp4` with `AI_GATEWAY_API_KEY` from secrets.
- Commit `out/<name>/{source.json,transcript.json,transcript.md}` to the PR branch (frames are regenerated by the next job; they stay out of git).
- Concurrency group per PR, cancel in progress; 20 minute timeout; refuse recordings over a length cap (say 15 minutes) with a comment, so a mistaken upload can't burn an hour.

**`suggest`** (Claude Code)
- Same setup, then `anthropics/claude-code-action` with a prompt that is the skill's own first step: *"Animate `videos/<name>.mp4` per `.claude/skills/animate-video/SKILL.md`. The transcript is in `out/<name>/`. Render, look at the strips, then push `out/<name>/` to this branch and post the review comment."* The skill already says what the comment contains.
- Model: the one we have been using; set `max_turns` and a budget so a stuck run ends.
- Uploads `edited.mp4`, GIFs and strips to the `renders` release (`gh release upload --clobber`), writes `out/<name>/assets.json` with the URLs, commits the text outputs, posts the comment.
- A failed validation posts the validator's output as the comment instead of failing silently.

**Picks loop.** `issue_comment` on a PR, body starting with `/animate`, same three gates → the `suggest` job with the comment body as the picks. The skill's step 4 ("Apply the picks") already describes the behaviour; the Action just hands it the text.

Alternative considered: Claude Code Remote sessions and Routines (what runs this conversation). They work and need less YAML, but the trigger would live in one person's account rather than in the repo, and a reviewer could not see why a run did or didn't start. Keep them for driving the eval rounds by hand; use Actions for the product path.

## 4. What the uploader sees

1. Opens a PR titled with the video name, drags `my-talk.mp4` into `videos/`, optionally adds `videos/my-talk.md` with two lines ("audience: app devs; please keep the demo at 1:20 intact").
2. Adds the `animate` label, or comments `/animate`.
3. Ten minutes later: a comment with the pacing line, one GIF and one strip per beat with checkboxes, the cuts, and **Download: edited.mp4 · captions.srt**. The Vercel preview link on the PR shows the same with a player.
4. Replies `/animate drop beat-3, beat-6 at 1:12, beat-9 should say "…"`. New render, new comment, same links updated.
5. Downloads the MP4 and publishes. Merges the PR so the edit list and storyboard are kept, or closes it.

Nothing to install, no keys, no terminal.

## 5. Phases

**Phase 0, decisions and prerequisites (half a day, mostly yours)**
- [ ] Public source recordings: acceptable, or private storage? (Decides LFS vs manifest.)
- [ ] Org LFS quota; enable LFS; `.gitattributes` for `videos/*.mp4`.
- [ ] Repo secrets: `AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY` (or the Claude GitHub App's OAuth token); install the Claude GitHub App on the repo.
- [ ] `.github/animators.txt` with the first names.
- [ ] One history rewrite to drop the MP4s and GIFs already committed.

**Phase 1, the happy path (one PR)**
- [ ] `.github/workflows/animate.yml`: gates, `ingest`, `suggest`, release upload, review comment.
- [ ] `scripts/assets.mjs`: upload to the release, write `assets.json`; `site.mjs` and `report.mjs` read it.
- [ ] Length cap and concurrency.
- [ ] Dry run on `vibenet_demo_2.mp4` from a fresh PR by a second account on the allowlist, and one from an account not on it (must not run).

**Phase 2, the loop (one PR)**
- [ ] `/animate <picks>` on `issue_comment`.
- [ ] The comment updates in place (edit the agent's own comment rather than stacking new ones), keeping the checkbox state.

**Phase 3, hardening (small PRs as needed)**
- [ ] Validation as a check run so a red edit list blocks merge.
- [ ] Cost line in the comment (transcription minutes, tokens, Actions minutes), so nobody is surprised.
- [ ] Private media path (manifest + signed URLs) if Phase 0 decided it.
- [ ] A weekly job that deletes release assets for closed PRs older than 30 days.

**Not in scope.** A web upload form, accounts, a queue, a dashboard. The PR is the form, GitHub is the queue, the review page is the dashboard.

## 6. Open questions for you

1. Are recordings publishable the moment they are pushed, or embargoed? This is the one decision that changes the uploader's step.
2. Who is on the first allowlist, and should the `animate` label or the `/animate` comment be the default go? (Comment is friendlier for people who don't know labels; label is harder to trigger by accident.)
3. Budget per run you're comfortable with. A three-minute video today costs one transcription call, one agent run of about 15 to 25 turns, and about ten Actions minutes. The cap and the concurrency settings follow from that number.
4. Keep the Vercel review page? It is the nicest "download within the PR" experience (player, GIFs, report on one URL per branch) and already exists; it just needs to read asset URLs instead of copying files.
