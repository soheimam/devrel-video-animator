// Serves the local store (.jobs/) in development, where there is no Blob store.
import fs from 'node:fs';
import path from 'node:path';
import { isAuthed } from '../../../lib/auth';
import { contentTypeFor } from '../../../lib/store';

export async function GET(req, { params }) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new Response('Not found', { status: 404 });
  if (!(await isAuthed())) return new Response('Sign in first.', { status: 401 });
  const { path: parts } = await params;
  const root = process.env.JOBS_DIR || path.resolve(process.cwd(), '..', '.jobs');
  const file = path.join(/*turbopackIgnore: true*/ root, ...parts);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('Not found', { status: 404 });
  const stat = fs.statSync(file);
  const range = req.headers.get('range');
  const type = contentTypeFor(file);
  if (range && type.startsWith('video/')) {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = Number(s);
    const end = e ? Number(e) : Math.min(start + 4 * 1024 * 1024, stat.size - 1);
    const stream = fs.createReadStream(file, { start, end });
    return new Response(stream, { status: 206, headers: { 'content-type': type, 'content-range': `bytes ${start}-${end}/${stat.size}`, 'accept-ranges': 'bytes', 'content-length': String(end - start + 1) } });
  }
  return new Response(fs.createReadStream(file), { headers: { 'content-type': type, 'content-length': String(stat.size), 'accept-ranges': 'bytes', 'cache-control': 'no-store' } });
}
