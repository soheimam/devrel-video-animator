// Development only: when there is no Blob store, uploads land in .jobs/uploads/ on disk.
import fs from 'node:fs';
import path from 'node:path';
import { isAuthed } from '../../../lib/auth';

export async function POST(req) {
  if (!(await isAuthed())) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: 'Not available with a Blob store.' }, { status: 400 });
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return new Response('No file', { status: 400 });
  const dir = path.join(process.env.JOBS_DIR || path.resolve(process.cwd(), '..', '.jobs'), 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/local/uploads/${name}`, path: path.join(dir, name) });
}
