import path from 'node:path';
import { isAuthed, unauthorized } from '../../../lib/auth';
import { createStore, writeState, newJobId } from '../../../lib/store';
import { launchJob } from '../../../lib/launch';

const slug = (file) => path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recording';

export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const { fileName, sourceUrl, notes = '', size = 0 } = await req.json();
  if (!fileName || !sourceUrl) return Response.json({ error: 'Missing the file.' }, { status: 400 });
  const store = createStore();
  const id = newJobId();
  const name = slug(fileName);
  // Local uploads are stored on disk; the runner reads them by path.
  const source = sourceUrl.startsWith('/local/') ? `file://${path.join(process.env.JOBS_DIR || path.resolve(process.cwd(), '..', '.jobs'), sourceUrl.replace('/local/', ''))}` : sourceUrl;
  const job = { id, name, fileName, sourceUrl: source, notes: String(notes).slice(0, 4000), size, createdAt: new Date().toISOString(), rounds: [{ n: 1, mode: 'suggest', picks: null, startedAt: new Date().toISOString() }] };
  await store.putJson(`jobs/${id}/job.json`, job);
  await writeState(store, id, { status: 'queued', round: 1, mode: 'suggest', message: 'starting a machine' });
  try {
    const launched = await launchJob(id);
    await store.putJson(`jobs/${id}/job.json`, { ...job, launched });
  } catch (e) {
    await writeState(store, id, { status: 'failed', round: 1, message: `Could not start: ${e.message}` });
    return Response.json({ error: e.message, id }, { status: 500 });
  }
  return Response.json({ id });
}

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  const store = createStore();
  const files = (await store.list('jobs/')).filter((f) => f.key.endsWith('/job.json'));
  const jobs = (await Promise.all(files.map((f) => store.getJson(f.key)))).filter(Boolean);
  return Response.json(jobs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}
