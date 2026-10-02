// Serves the templates to headless Chromium and drives the stage. Used by the renderer
// and the template tests.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.js';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript' };
const ALLOWED = ['templates/', 'lib/', 'node_modules/animejs/'];

export function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    const file = path.join(ROOT, rel);
    if (!ALLOWED.some((p) => rel.startsWith(p)) || !file.startsWith(ROOT) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

export async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is not installed. Run `npm install`.');
  }
  // CHROMIUM_PATH: a Chromium that isn't Playwright's own (a sandbox or Lambda build).
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

// Opens a stage page sized to the design space and scaled to the output resolution.
export async function openStage(browser, baseUrl, design, scale) {
  const page = await browser.newPage({
    viewport: { width: design.w, height: design.h },
    deviceScaleFactor: scale,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${baseUrl}/templates/stage.html`);
  await page.waitForFunction(() => window.stageReady === true);
  return { page, errors };
}
