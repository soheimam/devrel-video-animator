import { isAuthed, unauthorized } from '../../../../lib/auth';
import { createStore, readState, writeState } from '../../../../lib/store';
import { launchJob, stopSandbox, peekSandbox } from '../../../../lib/launch';

const safeId = (id) => /^[\w-]{6,40}$/.test(id);

export async function GET(_req, { params }) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  if (!safeId(id)) return Response.json({ error: 'No such job.' }, { status: 404 });
  const store = createStore();
  const job = await store.getJson(`jobs/${id}/job.json`);
  if (!job) return Response.json({ error: 'No such job.' }, { status: 404 });
  let state = (await readState(store, id)) || { status: 'queued' };
  // Before the job reports anything, show what the machine itself is doing.
  if (state.status === 'queued' && job.launched) {
    const machine = job.launched.sandboxId ? await peekSandbox(job.launched.sandboxId) : { status: 'unknown', error: 'no machine id was recorded' };
    const startedAt = Date.parse(job.rounds[job.rounds.length - 1]?.startedAt || job.createdAt);
    const dead = ['stopped', 'failed', 'aborted'].includes(machine.status);
    const stale = Date.now() - startedAt > 25 * 60 * 1000;
    if (dead || stale) {
      const why = dead ? `The machine ${machine.status} before the job reported anything.` : `The machine has not reported in 25 minutes${machine.error ? ` (${machine.error})` : ''}.`;
      state = await writeState(store, id, { status: 'failed', round: state.round, message: why, error: [machine.bootstrap, machine.job].filter(Boolean).join('\n---\n').slice(-3000) });
    } else {
      state = { ...state, machine };
    }
  }
  // A finished job's sandbox has nothing left to do; stop paying for it.
  if (['done', 'failed'].includes(state.status) && job.launched?.sandboxId && !job.launched.stopped) {
    if (await stopSandbox(job.launched.sandboxId)) await store.putJson(`jobs/${id}/job.json`, { ...job, launched: { ...job.launched, stopped: true } });
  }
  return Response.json({ job, state });
}

export async function POST(req, { params }) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  if (!safeId(id)) return Response.json({ error: 'No such job.' }, { status: 404 });
  const store = createStore();
  const job = await store.getJson(`jobs/${id}/job.json`);
  if (!job) return Response.json({ error: 'No such job.' }, { status: 404 });
  const body = await req.json();

  if (body.action === 'delete') {
    if (job.launched?.sandboxId && !job.launched.stopped) await stopSandbox(job.launched.sandboxId);
    await store.del([`jobs/${id}/`]);
    // Nothing else should ever find this job again, even if a delete of some file fails.
    if (job.sourceUrl?.startsWith('http') && !/^file:/.test(job.sourceUrl)) {
      try { await store.del([new URL(job.sourceUrl).pathname.replace(/^\//, '')]); } catch { /* best effort */ }
    }
    return Response.json({ ok: true });
  }

  if (body.action === 'rerender') {
    const state = await readState(store, id);
    if (state && !['done', 'failed'].includes(state.status)) return Response.json({ error: 'Still working on the last round.' }, { status: 409 });
    const picks = { drop: Array.isArray(body.drop) ? body.drop.filter((s) => typeof s === 'string').slice(0, 100) : [], notes: String(body.notes || '').slice(0, 4000) };
    if (!picks.drop.length && !picks.notes.trim()) return Response.json({ error: 'Untick something or write a note first.' }, { status: 400 });
    const n = job.rounds.length + 1;
    const next = { ...job, rounds: [...job.rounds, { n, mode: 'picks', picks, startedAt: new Date().toISOString() }] };
    await store.putJson(`jobs/${id}/job.json`, next);
    await writeState(store, id, { status: 'queued', round: n, mode: 'picks', message: 'starting a machine' });
    try {
      const launched = await launchJob(id, { store });
      await store.putJson(`jobs/${id}/job.json`, { ...next, launched });
    } catch (e) {
      await writeState(store, id, { status: 'failed', round: n, message: `Could not start: ${e.message}` });
      return Response.json({ error: e.message }, { status: 500 });
    }
    return Response.json({ ok: true, round: n });
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 });
}
