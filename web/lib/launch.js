// Starts a job somewhere with ffmpeg and a browser: a Vercel Sandbox in production, a child
// process of this app locally. Either way the machine clones nothing from the user; it runs
// scripts/job.mjs, which reads the job from the store and writes progress back to it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const useLocal = () => process.env.LOCAL_RUNNER === '1' || !process.env.BLOB_READ_WRITE_TOKEN;

export async function launchJob(id) {
  if (useLocal()) return launchLocal(id);
  return launchSandbox(id);
}

function launchLocal(id) {
  const logDir = path.join(ROOT, '.jobs', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const log = fs.openSync(path.join(logDir, `${id}.log`), 'a');
  const child = spawn(process.execPath, ['scripts/job.mjs', '--id', id], { cwd: ROOT, detached: true, stdio: ['ignore', log, log], env: { ...process.env, JOBS_DIR: process.env.JOBS_DIR || path.join(ROOT, '.jobs') } });
  child.unref();
  return { runner: 'local', pid: child.pid };
}

async function launchSandbox(id) {
  const { Sandbox } = await import('@vercel/sandbox');
  const revision = process.env.REPO_REVISION || process.env.VERCEL_GIT_COMMIT_SHA || 'main';
  const url = process.env.REPO_URL || 'https://github.com/soheimam/devrel-video-animator.git';
  const sandbox = await Sandbox.create({
    name: `job-${id}-${Date.now().toString(36)}`,
    source: { type: 'git', url, revision, depth: 1 },
    image: process.env.SANDBOX_IMAGE || 'vercel/sandbox/node:22',
    resources: { vcpus: Number(process.env.SANDBOX_VCPUS || 4) },
    timeout: Number(process.env.SANDBOX_TIMEOUT_MS || 45 * 60 * 1000),
  });
  const env = {
    JOB_ID: id,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY || '',
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
    AGENT_MODEL: process.env.AGENT_MODEL || 'anthropic/claude-opus-5-5',
    CI: '1',
  };
  for (const k of ['OPENAI_API_KEY', 'DEEPGRAM_API_KEY', 'TRANSCRIBE_PROVIDER']) if (process.env[k]) env[k] = process.env[k];
  const script = [
    'set -o pipefail',
    `(bash scripts/sandbox-bootstrap.sh > bootstrap.log 2>&1) || { node scripts/job.mjs --id "$JOB_ID" --fail "$(tail -c 800 bootstrap.log)"; exit 1; }`,
    'set -a; [ -f .sandbox-env ] && . ./.sandbox-env; set +a',
    'node scripts/job.mjs --id "$JOB_ID" > job.log 2>&1',
  ].join('\n');
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', script], env, detached: true });
  // This SDK identifies a sandbox by name; keep it so the app can look in and stop it later.
  return { runner: 'sandbox', sandboxId: sandbox.name, sandboxName: sandbox.name };
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
