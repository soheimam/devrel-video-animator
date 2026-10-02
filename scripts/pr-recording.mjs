#!/usr/bin/env node
// Finds the recording a pull request is about, and makes sure it is on disk.
//
// Two ways a recording arrives, easiest first:
//   1. Dragged into the PR description. GitHub stores it as a user-attachments URL; we download
//      it to videos/<slug>.mp4 and write videos/<slug>.yaml so later runs find it again.
//   2. Added as videos/<name>.mp4 in the PR itself.
//
// Usage: node scripts/pr-recording.mjs <pr-number>      (prints JSON: { file, name, source })
// Needs `gh` authenticated (GitHub Actions provides it). Pure helpers are exported for tests.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { ROOT, slugFor } from '../lib/paths.js';
import { isMain } from '../lib/cli.js';

const ATTACHMENT = /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+|https:\/\/[^\s)"'<>]+\.(?:mp4|mov)(?=[\s)"'<>]|$)/gi;

// The first video attachment or video URL in a PR body, or null.
export function findAttachment(body = '') {
  const m = body.match(ATTACHMENT);
  return m ? m[0] : null;
}

// The first recording among the PR's files (added or changed under videos/), or null.
export function pickVideoFile(files = []) {
  return files.map((f) => (typeof f === 'string' ? f : f.path)).find((p) => /^videos\/[^/]+\.(mp4|mov)$/i.test(p)) || null;
}

// A name for the recording: the attached file's name when GitHub kept it, else the PR title.
export function nameFor({ title = '', body = '', file = null }) {
  if (file) return slugFor(file);
  const named = body.match(/\[([^\]]+\.(?:mp4|mov))\]\(/i);
  if (named) return slugFor(named[1]);
  return slugFor(title.replace(/\.(mp4|mov)$/i, '') || 'recording');
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', env: process.env });
}

async function download(url, file) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

export async function locateRecording(prNumber, { log = console.error } = {}) {
  const pr = JSON.parse(gh(['pr', 'view', String(prNumber), '--json', 'title,body,files']));
  const inRepo = pickVideoFile(pr.files);
  if (inRepo) {
    const name = slugFor(inRepo);
    const manifest = path.join(ROOT, 'videos', `${name}.yaml`);
    if (!fs.existsSync(path.join(ROOT, inRepo)) && fs.existsSync(manifest)) {
      const { source } = YAML.parse(fs.readFileSync(manifest, 'utf8'));
      log(`recording: fetching ${inRepo} from ${source}`);
      await download(source, path.join(ROOT, inRepo));
    }
    return { file: inRepo, name, source: null };
  }
  const url = findAttachment(pr.body);
  if (!url) return null;
  const name = nameFor({ title: pr.title, body: pr.body });
  const file = path.join('videos', `${name}.mp4`);
  const manifest = path.join(ROOT, 'videos', `${name}.yaml`);
  if (!fs.existsSync(path.join(ROOT, file))) {
    log(`recording: downloading the attachment to ${file}`);
    await download(url, path.join(ROOT, file));
  }
  if (!fs.existsSync(manifest)) {
    fs.writeFileSync(manifest, YAML.stringify({ name, source: url, note: 'Written by scripts/pr-recording.mjs; the MP4 itself is not committed.' }));
  }
  return { file, name, source: url };
}

if (isMain(import.meta.url)) {
  const n = process.argv[2];
  if (!n) {
    console.error('Usage: node scripts/pr-recording.mjs <pr-number>');
    process.exit(2);
  }
  locateRecording(n)
    .then((r) => {
      if (!r) {
        console.error('No recording found: add videos/<name>.mp4 to the PR, or drag the MP4 into the PR description.');
        process.exit(3);
      }
      console.log(JSON.stringify(r));
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
