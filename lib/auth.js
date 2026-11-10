// Admin guard: checks the Supabase Auth token and that it belongs to ADMIN_USER_ID.
import { getSupabase } from './supabase.js';
import { HttpError } from './http.js';

const unauthorized = () => new HttpError(401, 'unauthorized', 'צריך להיכנס שוב');

// Reads "Authorization: Bearer <access_token>". Throws 401 when missing, wrong or not the admin.
export async function requireAdmin(req) {
  const header = String(req.headers?.authorization ?? '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId) console.error('[auth] Missing ADMIN_USER_ID');
  if (!token || !adminId) throw unauthorized();

  const { data, error } = await getSupabase().auth.getUser(token);
  if (error || !data?.user || data.user.id !== adminId) throw unauthorized();
  return data.user;
}
