// Where a job's files live. On Vercel: Blob (public URLs the review page can play and download).
// Locally, or in tests: a folder under .jobs/, served by the web app's /local route. Same
// interface either way, so scripts/job.mjs and the web app never know which one they have.
//
// Layout:  jobs/<id>/job.json          what was asked (name, source, notes, rounds)
//          jobs/<id>/state-<ts>.json   progress, newest wins (immutable files cache safely)
//          jobs/<id>/r<round>/...      outputs of a round: edited.mp4, captions, preview/*, review.json
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.js';

const TYPES = { '.mp4': 'video/mp4', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.json': 'application/json', '.srt': 'text/plain', '.vtt': 'text/vtt', '.md': 'text/markdown', '.yaml': 'text/yaml' };
export const contentTypeFor = (file) => TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';

// `blob` lets the caller supply the @vercel/blob module (the web app bundles its own copy);
// by default it is loaded from this package's dependencies at first use.
export function createStore(env = process.env, { blob } = {}) {
  return env.BLOB_READ_WRITE_TOKEN ? blobStore(env, blob) : localStore(env.JOBS_DIR || path.join(ROOT, '.jobs'));
}

function localStore(dir) {
  const file = (key) => path.join(dir, key);
  return {
    kind: 'local',
    urlFor: (key) => `/local/${key}`,
    async putJson(key, obj) {
      fs.mkdirSync(path.dirname(file(key)), { recursive: true });
      fs.writeFileSync(file(key), JSON.stringify(obj, null, 2));
      return `/local/${key}`;
    },
    async getJson(key, fallback = null) {
      return fs.existsSync(file(key)) ? JSON.parse(fs.readFileSync(file(key), 'utf8')) : fallback;
    },
    async putFile(key, localPath) {
      fs.mkdirSync(path.dirname(file(key)), { recursive: true });
      fs.copyFileSync(localPath, file(key));
      return `/local/${key}`;
    },
    async getFile(key, localPath) {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.copyFileSync(file(key), localPath);
    },
    async list(prefix) {
      // A prefix may be a folder ("jobs/") or part of a file name ("jobs/<id>/state-").
      const start = fs.existsSync(file(prefix)) && fs.statSync(file(prefix)).isDirectory() ? file(prefix) : path.dirname(file(prefix));
      if (!fs.existsSync(start)) return [];
      const out = [];
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) walk(p);
          else {
            const key = path.relative(dir, p).split(path.sep).join('/');
            if (key.startsWith(prefix)) out.push({ key, url: `/local/${key}`, size: fs.statSync(p).size });
          }
        }
      };
      walk(start);
      return out;
    },
    async del(keys) {
      for (const k of keys) fs.rmSync(file(k), { force: true, recursive: true });
    },
    localPath: file,
  };
}

function blobStore(env, provided) {
  let mod;
  const name = '@vercel/blob'; // a variable, so bundlers leave this import to Node
  const blob = async () => (mod ??= provided ? await provided() : await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ name));
  const opts = { access: 'public', addRandomSuffix: false, allowOverwrite: true, token: env.BLOB_READ_WRITE_TOKEN };
  return {
    kind: 'blob',
    urlFor: null, // only known after a put; callers keep the returned url
    async putJson(key, obj) {
      const { put } = await blob();
      const r = await put(key, JSON.stringify(obj), { ...opts, contentType: 'application/json' });
      return r.url;
    },
    async getJson(key, fallback = null) {
      const { list } = await blob();
      const { blobs } = await list({ prefix: key, limit: 1, token: env.BLOB_READ_WRITE_TOKEN });
      const hit = blobs.find((b) => b.pathname === key);
      if (!hit) return fallback;
      const res = await fetch(`${hit.url}?t=${Date.now()}`, { cache: 'no-store' });
      return res.ok ? res.json() : fallback;
    },
    async putFile(key, localPath) {
      const { put } = await blob();
      const r = await put(key, fs.createReadStream(localPath), { ...opts, contentType: contentTypeFor(localPath), multipart: fs.statSync(localPath).size > 8 * 1024 * 1024 });
      return r.url;
    },
    async getFile(key, localPath) {
      const { list } = await blob();
      const { blobs } = await list({ prefix: key, limit: 1, token: env.BLOB_READ_WRITE_TOKEN });
      const hit = blobs.find((b) => b.pathname === key);
      if (!hit) throw new Error(`Not in the store: ${key}`);
      const res = await fetch(hit.url, { cache: 'no-store' });
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()));
    },
    async list(prefix) {
      const { list } = await blob();
      const out = [];
      let cursor;
      do {
        const page = await list({ prefix, cursor, limit: 1000, token: env.BLOB_READ_WRITE_TOKEN });
        out.push(...page.blobs.map((b) => ({ key: b.pathname, url: b.url, size: b.size })));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
    async del(keys) {
      const { del } = await blob();
      const all = [];
      for (const k of keys) all.push(...(await this.list(k)).map((b) => b.url));
      if (all.length) await del(all, { token: env.BLOB_READ_WRITE_TOKEN });
    },
  };
}

// Job state: the newest state-<ts>.json wins.
export async function readState(store, id) {
  const files = (await store.list(`jobs/${id}/state-`)).sort((a, b) => (a.key < b.key ? 1 : -1));
  if (!files.length) return null;
  return store.getJson(files[0].key);
}

export async function writeState(store, id, state) {
  const ts = String(Date.now()).padStart(14, '0');
  const full = { ...state, at: new Date().toISOString() };
  await store.putJson(`jobs/${id}/state-${ts}.json`, full);
  return full;
}

export const newJobId = () => `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
