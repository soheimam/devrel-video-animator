#!/usr/bin/env bash
# Prepares a fresh machine (a Vercel Sandbox) to run scripts/job.mjs: ffmpeg, the fonts the
# captions use, the repo's dependencies and a Chromium for the overlay renderer. Writes
# .sandbox-env with any path overrides the job needs. Idempotent; safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."
: > .sandbox-env

if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg fonts-liberation) >/dev/null 2>&1 || true
  elif command -v dnf >/dev/null 2>&1; then
    (sudo dnf install -y -q ffmpeg-free 2>/dev/null || sudo dnf install -y -q ffmpeg) >/dev/null 2>&1 || true
  fi
fi

npm ci --no-audit --no-fund --loglevel=error

if ! command -v ffmpeg >/dev/null 2>&1; then
  # No package manager had it: use the static builds.
  npm install --no-save --no-audit --no-fund --loglevel=error ffmpeg-static ffprobe-static
  echo "FFMPEG_PATH=$(node -p "require('ffmpeg-static')")" >> .sandbox-env
  echo "FFPROBE_PATH=$(node -p "require('ffprobe-static').path")" >> .sandbox-env
fi

# Playwright's Chromium, with system libraries when the distro allows; otherwise the Lambda build.
if ! (npx playwright install --with-deps chromium >/dev/null 2>&1 || npx playwright install chromium >/dev/null 2>&1); then
  npm install --no-save --no-audit --no-fund --loglevel=error @sparticuz/chromium
  echo "CHROMIUM_PATH=$(node -e "require('@sparticuz/chromium').executablePath().then(p=>console.log(p))")" >> .sandbox-env
fi

echo "bootstrap ok"; cat .sandbox-env
