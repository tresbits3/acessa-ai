import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { longSecret } from './config';
import { safeEqual } from './identity';
const cookieName = 'unifsp_admin';
function signature(payload: string) { return createHmac('sha256', longSecret('SESSION_SECRET')).update(payload).digest('hex'); }
export function makeSession() { const payload = String(Date.now() + 7 * 86400_000); return `${payload}.${signature(payload)}`; }
export function validSession(value?: string) {
  if (!value) return false;
  const [payload, mac] = value.split('.');
  return !!payload && !!mac && Number(payload) > Date.now() && safeEqual(signature(payload), mac);
}
export async function isAdmin() { return validSession((await cookies()).get(cookieName)?.value); }
export async function requireAdmin() { if (!(await isAdmin())) redirect('/'); }
export function adminCookie() { return cookieName; }
export function adminResponse() { return Response.json({ error: 'Acesso restrito.' }, { status: 403 }); }
