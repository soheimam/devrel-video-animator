import { isAuthed, unauthorized } from '../../../lib/auth';
import { createStore } from '../../../lib/store';
import { startPrepare, machineStatus, forgetSnapshot } from '../../../lib/launch';

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  if (process.env.LOCAL_RUNNER === '1' || !process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ local: true });
  try {
    return Response.json(await machineStatus(createStore()));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  if (process.env.LOCAL_RUNNER === '1' || !process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: 'Not available locally.' }, { status: 400 });
  const { action } = await req.json();
  const store = createStore();
  try {
    if (action === 'prepare') return Response.json(await startPrepare(store));
    if (action === 'forget') { await forgetSnapshot(store); return Response.json({ ok: true }); }
    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
