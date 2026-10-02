# web/

The front door: sign in with a passcode, drop a recording, get it back edited. Everything runs on Vercel: this app, Blob storage for the files, a Sandbox for each job (ffmpeg, Chromium, the agent), and the AI Gateway for transcription and the model. One key.

```
drop MP4 ──▶ Blob ──▶ job.json ──▶ Sandbox runs scripts/job.mjs ──▶ renders ──▶ Blob ──▶ review page
                                                                            picks ◀── checkboxes + notes
```

## Deploy

1. Vercel project with **Root Directory `web`**, framework preset Next.js, and no Build/Output/Install overrides (a project that previously served the static review page keeps an `Output Directory: public` override; clear it). Link a **public Blob** store (sets `BLOB_READ_WRITE_TOKEN`).
2. Environment variables, from `.env.example`: `APP_PASSCODE`, `AUTH_SECRET`, `AI_GATEWAY_API_KEY`, optionally `AGENT_MODEL`.
3. Sandboxes authenticate with the deployment's own identity; nothing to add. The Sandbox clones this repository at the deployed commit, so the pipeline the app runs is the one in git.

## Run locally

```bash
cp .env.example .env.local      # LOCAL_RUNNER=1, no Blob token: jobs run as a child process, files live in ../.jobs/
npm install && npm run dev      # the pipeline's own deps must be installed at the repo root too
```

Without `AI_GATEWAY_API_KEY` the agent can't run; `node ../scripts/job.mjs --local ../videos/x.mp4 --from-out ../out/x --no-agent` replays an existing edit list so the pages can be tried.
