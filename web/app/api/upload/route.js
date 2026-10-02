import { handleUpload } from '@vercel/blob/client';
import { isAuthed } from '../../../lib/auth';

export async function POST(req) {
  if (!(await isAuthed())) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json();
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'application/octet-stream'],
        maximumSizeInBytes: 3 * 1024 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (e) {
    console.error('upload token failed:', e);
    return Response.json({ error: `Could not start the upload: ${e.message}` }, { status: 400 });
  }
}
