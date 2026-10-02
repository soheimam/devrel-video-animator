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

// Finds a browser that works on this machine, repairing the install if it has to:
// 1. CHROMIUM_PATH (a build set up by the sandbox bootstrap), if it exists;
// 2. Playwright's own Chromium;
// 3. if that is missing, install it now and try again;
// 4. a self-contained Chromium (@sparticuz/chromium), installed now if needed.
// Each step's reason is kept, so a failure says what was tried.
export async function launchBrowser({ log = () => {} } = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is not installed. Run `npm install`.');
  }
  const tried = [];
  const attempt = async (label, opts) => {
    try {
      const browser = await chromium.launch(opts);
      if (tried.length) log(`  browser: using ${label} (after: ${tried.join('; ')})`);
      return browser;
    } catch (e) {
      tried.push(`${label}: ${String(e.message).split('\n')[0].slice(0, 160)}`);
      return null;
    }
  };
  const fs = await import('node:fs');
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    const b = await attempt('CHROMIUM_PATH', { executablePath: process.env.CHROMIUM_PATH });
    if (b) return b;
  }
  let b = await attempt("Playwright's Chromium", {});
  if (b) return b;

  const { execFileSync } = await import('node:child_process');
  const sh = (cmd, args) => {
    try {
      execFileSync(cmd, args, { stdio: 'pipe', timeout: 10 * 60 * 1000, env: process.env });
      return true;
    } catch (e) {
      tried.push(`${cmd} ${args.join(' ')}: ${String(e.stderr || e.message).split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 160)}`);
      return false;
    }
  };
  log('  browser: installing Chromium for Playwright');
  if (sh('npx', ['playwright', 'install', 'chromium'])) {
    b = await attempt("Playwright's Chromium (just installed)", {});
    if (b) return b;
  }

  log('  browser: falling back to a self-contained Chromium');
  let sparticuz;
  try {
    sparticuz = (await import('@sparticuz/chromium')).default;
  } catch {
    if (sh('npm', ['install', '--no-save', '--no-audit', '--no-fund', '--loglevel=error', '@sparticuz/chromium'])) {
      try { sparticuz = (await import('@sparticuz/chromium')).default; } catch (e) { tried.push(`@sparticuz/chromium import: ${e.message}`); }
    }
  }
  if (sparticuz) {
    b = await attempt('@sparticuz/chromium', { executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
    if (b) return b;
  }
  throw new Error(`No browser could start. Tried: ${tried.join(' | ')}`);
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
