import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'dva_session';
const secret = () => process.env.AUTH_SECRET || 'dev-secret-change-me';
const sign = (value) => createHmac('sha256', secret()).update(value).digest('hex');

export function checkPasscode(input) {
  const expected = process.env.APP_PASSCODE || '';
  if (!expected) return process.env.NODE_ENV !== 'production'; // no passcode set: open in dev, closed in prod
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionValue() {
  const issued = String(Date.now());
  return `${issued}.${sign(issued)}`;
}

export function validSession(value) {
  if (!value) return false;
  const [issued, sig] = value.split('.');
  if (!issued || !sig) return false;
  const good = sign(issued);
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return false;
  return Date.now() - Number(issued) < 30 * 24 * 3600 * 1000;
}

export async function isAuthed() {
  if (!process.env.APP_PASSCODE && process.env.NODE_ENV !== 'production') return true;
  const jar = await cookies();
  return validSession(jar.get(COOKIE)?.value);
}

export function sessionCookie() {
  return { name: COOKIE, value: sessionValue(), httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 24 * 3600 };
}

export const unauthorized = () => Response.json({ error: 'Sign in first.' }, { status: 401 });
