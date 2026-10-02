// Starts a job somewhere with ffmpeg and a browser: a Vercel Sandbox in production, a child
// process of this app locally. Either way the machine clones nothing from the user; it runs
// scripts/job.mjs, which reads the job from the store and writes progress back to it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const useLocal = () => process.env.LOCAL_RUNNER === '1' || !process.env.BLOB_READ_WRITE_TOKEN;

export async function launchJob(id, { store } = {}) {
  if (useLocal()) return launchLocal(id);
  return launchSandbox(id, { store });
}

function launchLocal(id) {
  const logDir = path.join(ROOT, '.jobs', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const log = fs.openSync(path.join(logDir, `${id}.log`), 'a');
  const child = spawn(process.execPath, ['scripts/job.mjs', '--id', id], { cwd: ROOT, detached: true, stdio: ['ignore', log, log], env: { ...process.env, JOBS_DIR: process.env.JOBS_DIR || path.join(ROOT, '.jobs') } });
  child.unref();
  return { runner: 'local', pid: child.pid };
}

// Machines run the newest pipeline on the branch, not the commit the web app was built from:
// pipeline-only changes don't redeploy the app (Vercel skips builds with no web/ changes).
const REVISION = () => process.env.REPO_REVISION || process.env.REPO_BRANCH || 'main';
const REPO = () => process.env.REPO_URL || 'https://github.com/soheimam/devrel-video-animator.git';
const RESOURCES = () => ({ vcpus: Number(process.env.SANDBOX_VCPUS || 4) });
const BRANCH = () => process.env.REPO_BRANCH || 'main';
// Runs first in every machine: find the checkout (the SDK's clone location is not guaranteed),
// clone it ourselves if it is missing, and move to the deployed commit. Logs what it found.
const prelude = (revision) => [
  'echo "cwd: $PWD"; ls -la | head -20',
  'if [ ! -f scripts/sandbox-bootstrap.sh ]; then for d in */; do [ -f "$d/scripts/sandbox-bootstrap.sh" ] && cd "$d" && break; done; fi',
  `if [ ! -f scripts/sandbox-bootstrap.sh ]; then echo "repo not here; cloning"; rm -rf repo; git clone --depth 1 --branch ${BRANCH()} ${REPO()} repo && cd repo; fi`,
  `(git fetch --depth 1 origin ${revision} && git checkout -q FETCH_HEAD && echo "at commit $(git rev-parse --short HEAD)") || echo "could not move to ${revision}; staying on $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"`,
].join('\n');
const SNAPSHOT_KEY = 'machine/snapshot.json';
const PENDING_KEY = 'machine/pending.json';

async function launchSandbox(id, { store } = {}) {
  const { Sandbox } = await import('@vercel/sandbox');
  const revision = REVISION();
  const snapshot = store ? await store.getJson(SNAPSHOT_KEY) : null;
  const name = `job-${id}-${Date.now().toString(36)}`;
  // From a prepared snapshot when there is one (seconds), else a cold machine (minutes).
  const sandbox = snapshot
    ? await Sandbox.create({ name, source: { type: 'snapshot', snapshotId: snapshot.snapshotId }, resources: RESOURCES(), timeout: Number(process.env.SANDBOX_TIMEOUT_MS || 45 * 60 * 1000) })
    : await Sandbox.create({
        name,
        source: { type: 'git', url: REPO(), revision: BRANCH(), depth: 1 },
        image: process.env.SANDBOX_IMAGE || 'vercel/sandbox/node:22',
        resources: RESOURCES(),
        timeout: Number(process.env.SANDBOX_TIMEOUT_MS || 45 * 60 * 1000),
      });
  const env = {
    JOB_ID: id,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY || '',
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
    AGENT_MODEL: process.env.AGENT_MODEL || 'anthropic/claude-opus-5.5',
    CI: '1',
  };
  for (const k of ['OPENAI_API_KEY', 'DEEPGRAM_API_KEY', 'TRANSCRIBE_PROVIDER']) if (process.env[k]) env[k] = process.env[k];
  const script = snapshot
    ? [
        // Prepared machine: move to the deployed commit, refresh deps only if the lockfile changed.
        `{ ${prelude(revision)}; } > bootstrap.log 2>&1`,
        '(npm ci --prefer-offline --no-audit --no-fund --loglevel=error >> bootstrap.log 2>&1) || echo "npm ci failed; using the snapshot\'s modules" >> bootstrap.log',
        'set -a; [ -f .sandbox-env ] && . ./.sandbox-env; set +a',
        'node scripts/job.mjs --id "$JOB_ID" > job.log 2>&1',
      ].join('\n')
    : [
        `{ ${prelude(revision)}; } > bootstrap.log 2>&1`,
        `(bash scripts/sandbox-bootstrap.sh >> bootstrap.log 2>&1) || { node scripts/job.mjs --id "$JOB_ID" --fail "$(tail -c 800 bootstrap.log)"; exit 1; }`,
        'set -a; [ -f .sandbox-env ] && . ./.sandbox-env; set +a',
        'node scripts/job.mjs --id "$JOB_ID" > job.log 2>&1',
      ].join('\n');
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', script], env, detached: true });
  // This SDK identifies a sandbox by name; keep it so the app can look in and stop it later.
  return { runner: 'sandbox', sandboxId: sandbox.name, sandboxName: sandbox.name, fromSnapshot: Boolean(snapshot) };
}

const getSandbox = async (name) => {
  const { Sandbox } = await import('@vercel/sandbox');
  return Sandbox.get({ name });
};

export async function stopSandbox(name) {
  try {
    const sandbox = await getSandbox(name);
    await sandbox.stop();
    return true;
  } catch {
    return false;
  }
}

// What a machine is doing while the job has not reported yet: its status and the tail of its
// logs. Lets the page show progress during bootstrap, and lets us fail a job whose machine died.
export async function peekSandbox(name) {
  try {
    const sandbox = await getSandbox(name);
    const tail = async (file) => {
      try {
        const buf = await sandbox.readFileToBuffer({ path: file });
        return buf ? buf.toString('utf8').slice(-1500) : '';
      } catch {
        return '';
      }
    };
    return { status: sandbox.status, bootstrap: await tail('bootstrap.log'), job: await tail('job.log') };
  } catch (e) {
    return { status: 'unknown', error: e.message };
  }
}

// Preparing a machine: bootstrap once on a cold sandbox, then snapshot it. Jobs start from the
// snapshot in seconds instead of installing ffmpeg, dependencies and Chromium every time.
// Two steps, because a bootstrap can outlive one request: start it, then finish it on a later
// status check once bootstrap.log says "bootstrap ok".
export async function startPrepare(store) {
  const { Sandbox } = await import('@vercel/sandbox');
  const revision = REVISION();
  const name = `prepare-${Date.now().toString(36)}`;
  const sandbox = await Sandbox.create({
    name,
    source: { type: 'git', url: REPO(), revision: BRANCH(), depth: 1 },
    image: process.env.SANDBOX_IMAGE || 'vercel/sandbox/node:22',
    resources: RESOURCES(),
    timeout: 30 * 60 * 1000,
  });
  const script = [
    `{ ${prelude(revision)}; } > bootstrap.log 2>&1`,
    'bash scripts/sandbox-bootstrap.sh >> bootstrap.log 2>&1; echo "exit $?" >> bootstrap.log',
  ].join('\n');
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', script], detached: true });
  const pending = { name, revision, startedAt: new Date().toISOString() };
  await store.putJson(PENDING_KEY, pending);
  return pending;
}

export async function machineStatus(store) {
  const snapshot = await store.getJson(SNAPSHOT_KEY);
  const pending = await store.getJson(PENDING_KEY);
  if (!pending) return { snapshot, pending: null };
  const peek = await peekSandbox(pending.name);
  const log = peek.bootstrap || '';
  const done = /bootstrap ok[\s\S]*exit 0/.test(log);
  const failed = /exit [1-9]/.test(log) || ['stopped', 'failed', 'aborted'].includes(peek.status);
  if (done) {
    try {
      const sandbox = await getSandbox(pending.name);
      const snap = await sandbox.snapshot({ expiration: 0 });
      const record = { snapshotId: snap.snapshotId, revision: pending.revision, createdAt: new Date().toISOString() };
      await store.putJson(SNAPSHOT_KEY, record);
      await store.del([PENDING_KEY]);
      try { await sandbox.stop(); } catch { /* fine */ }
      return { snapshot: record, pending: null, justFinished: true };
    } catch (e) {
      await store.del([PENDING_KEY]);
      return { snapshot, pending: null, error: `Snapshot failed: ${e.message}`, log: log.slice(-1500) };
    }
  }
  if (failed) {
    await store.del([PENDING_KEY]);
    try { await stopSandbox(pending.name); } catch { /* fine */ }
    return { snapshot, pending: null, error: 'Bootstrap failed on the prepare machine.', log: log.slice(-2500) };
  }
  return { snapshot, pending: { ...pending, machine: peek.status, log: log.slice(-1200) } };
}

export async function forgetSnapshot(store) {
  await store.del([SNAPSHOT_KEY]);
}

// Keeps the prepared machine current without anyone asking: prepares one the first time it is
// needed, finishes a pending preparation when its bootstrap is done, and prepares a fresh one
// after a deploy changes the commit. Cheap when nothing is pending.
export async function ensurePrepared(store) {
  if (useLocal()) return { local: true };
  try {
    const status = await machineStatus(store);
    const outdated = status.snapshot && status.snapshot.revision !== REVISION();
    if (!status.pending && (!status.snapshot || outdated)) {
      status.pending = await startPrepare(store);
    }
    return status;
  } catch (e) {
    return { error: e.message };
  }
}
