import { checkPasscode, sessionCookie } from '../../../lib/auth';

export async function POST(req) {
  const form = await req.formData();
  const ok = checkPasscode(form.get('code'));
  const url = new URL(ok ? '/' : '/login?error=1', req.url);
  const headers = new Headers({ Location: url.toString() });
  if (ok) {
    const c = sessionCookie();
    headers.append('Set-Cookie', `${c.name}=${c.value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${c.maxAge}${c.secure ? '; Secure' : ''}`);
  }
  return new Response(null, { status: 303, headers });
}
