#!/usr/bin/env node
// Builds public/: a static review page for Vercel. One card per video with the storyboard,
// the report, a GIF of every animation, and a link to the edited video. No framework, no
// dependencies; Markdown is rendered in the browser.
//
// Usage: npm run site
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/paths.js';
import { isMain } from '../lib/cli.js';

const PUBLIC = path.join(ROOT, 'public');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export function buildSite({ log = console.log } = {}) {
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC, { recursive: true });

  const outRoot = path.join(ROOT, 'out');
  const videos = fs.existsSync(outRoot)
    ? fs.readdirSync(outRoot).filter((d) => fs.existsSync(path.join(outRoot, d, 'report.md')) && d !== 'demo')
    : [];

  const cards = videos.map((name) => {
    const dir = path.join(outRoot, name);
    const files = { report: `videos/${name}/report.md` };
    copy(path.join(dir, 'report.md'), path.join(PUBLIC, files.report));
    if (fs.existsSync(path.join(dir, 'edited.mp4'))) {
      files.video = `videos/${name}/edited.mp4`;
      copy(path.join(dir, 'edited.mp4'), path.join(PUBLIC, files.video));
    }
    const storyboard = path.join(ROOT, 'storyboards', `${name}.md`);
    if (fs.existsSync(storyboard)) {
      files.storyboard = `videos/${name}/storyboard.md`;
      copy(storyboard, path.join(PUBLIC, files.storyboard));
    }
    const previewDir = path.join(dir, 'preview');
    files.gifs = fs.existsSync(previewDir)
      ? fs.readdirSync(previewDir).filter((f) => f.endsWith('.gif')).sort().map((f) => {
          copy(path.join(previewDir, f), path.join(PUBLIC, 'videos', name, 'preview', f));
          return { id: f.replace(/\.gif$/, ''), src: `videos/${name}/preview/${f}` };
        })
      : [];
    return { name, ...files };
  });

  fs.writeFileSync(path.join(PUBLIC, 'index.json'), JSON.stringify(cards, null, 2));
  fs.writeFileSync(path.join(PUBLIC, 'index.html'), page(cards));
  log(`  site: ${cards.length} video(s) → public/`);
  return cards;
}

function page(cards) {
  const nav = cards.map((c) => `<a href="#${esc(c.name)}">${esc(c.name)}</a>`).join(' · ');
  const sections = cards.map((c) => `
<section id="${esc(c.name)}">
  <h2>${esc(c.name)}</h2>
  ${c.video ? `<video controls preload="metadata" src="${esc(c.video)}"></video>` : '<p class="muted">No rendered video yet.</p>'}
  ${c.gifs.length ? `<h3>Animations</h3><div class="gifs">${c.gifs.map((g) => `<figure><img loading="lazy" src="${esc(g.src)}" alt="${esc(g.id)}"><figcaption>${esc(g.id)}</figcaption></figure>`).join('')}</div>` : ''}
  ${c.storyboard ? `<details open><summary>Storyboard</summary><div class="md" data-src="${esc(c.storyboard)}"></div></details>` : ''}
  <details><summary>Report</summary><div class="md" data-src="${esc(c.report)}"></div></details>
</section>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Video review</title>
<style>
  :root { color-scheme: light dark; --fg: #1a1d24; --bg: #fff; --muted: #6b7280; --line: #e5e7eb; --accent: #2563eb; }
  @media (prefers-color-scheme: dark) { :root { --fg: #f3f4f6; --bg: #0f1117; --muted: #9ca3af; --line: #2a2f3a; --accent: #8ab4ff; } }
  body { margin: 0; padding: 24px 16px 80px; background: var(--bg); color: var(--fg); font: 16px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 1100px; margin-inline: auto; }
  header { border-bottom: 1px solid var(--line); padding-bottom: 12px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { margin-top: 40px; } h3 { margin-bottom: 8px; }
  a { color: var(--accent); } .muted { color: var(--muted); }
  video { width: 100%; max-height: 70vh; background: #000; border-radius: 8px; }
  .gifs { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  figure { margin: 0; } figure img { width: 100%; border-radius: 8px; border: 1px solid var(--line); }
  figcaption { font-size: 13px; color: var(--muted); margin-top: 4px; }
  details { margin-top: 20px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 16px; }
  summary { cursor: pointer; font-weight: 600; }
  .md table { border-collapse: collapse; font-size: 14px; } .md td, .md th { border: 1px solid var(--line); padding: 4px 8px; vertical-align: top; }
  .md img { max-width: 100%; }
</style>
</head>
<body>
<header>
  <h1>Video review</h1>
  <p class="muted">Suggested animations, cuts and captions for each recording. Reply to the PR with picks (“keep beat-7”, “drop beat-3”).</p>
  <nav>${nav || '<span class="muted">No videos rendered yet.</span>'}</nav>
</header>
${sections}
<script type="module">
  import { marked } from 'https://cdn.jsdelivr.net/npm/marked@15/lib/marked.esm.js';
  for (const el of document.querySelectorAll('.md[data-src]')) {
    const src = el.dataset.src;
    const base = src.slice(0, src.lastIndexOf('/') + 1);
    const md = await (await fetch(src)).text();
    el.innerHTML = marked.parse(md.replace(/\\]\\(preview\\//g, '](' + base + 'preview/'));
  }
</script>
</body>
</html>
`;
}

if (isMain(import.meta.url)) buildSite();
