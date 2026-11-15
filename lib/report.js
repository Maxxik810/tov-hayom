// Action "report": a visitor reports a wrong detail of a place (F19).
// No name, phone or email is collected. The report is saved inside places.reports through
// the database function add_report, which refuses it when the place already has 5 open reports.
import { randomUUID } from 'node:crypto';
import { getSupabase } from './supabase.js';
import { HttpError } from './http.js';
import { israelToday } from './date.js';
import { effectiveLevel, PUBLIC_LEVELS } from './level.js';
import { UUID } from './rating.js';

// Same ids as data/report-types.json (a test keeps them equal)
export const REPORT_TYPES = ['hours', 'closed', 'other'];
export const MAX_TEXT = 300;
export const MAX_OPEN_REPORTS = 5;

const bad = () => new HttpError(400, 'bad_input', 'הדיווח לא תקין');

// Returns { place_id, type, text } or throws 400. Any extra field is refused.
export function validateReport(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw bad();
  const allowed = new Set(['place_id', 'type', 'text']);
  if (Object.keys(input).some(k => !allowed.has(k))) throw bad();

  const { place_id: placeId, type } = input;
  if (typeof placeId !== 'string' || !UUID.test(placeId)) throw bad();
  if (typeof type !== 'string' || !REPORT_TYPES.includes(type)) throw bad();

  const rawText = input.text === undefined ? '' : input.text;
  if (typeof rawText !== 'string') throw bad();
  // Control characters out, line breaks and spaces tidied
  const text = rawText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (Array.from(text).length > MAX_TEXT) throw bad();
  if (type === 'other' && text === '') throw bad();

  return { place_id: placeId, type, text };
}

const countOpen = reports =>
  Array.isArray(reports) ? reports.filter(r => r?.status === 'open').length : 0;

const tooMany = () =>
  new HttpError(429, 'too_many_reports', 'כבר קיבלנו דיווחים על המקום הזה, תודה');

export async function submitReport(input, deps = {}) {
  const { place_id: placeId, type, text } = validateReport(input);
  const db = deps.db ?? getSupabase();
  const date = deps.date ?? israelToday();

  const { data: place, error } = await db
    .from('places')
    .select('id, is_blocked, verification_level, last_verified_at, reports')
    .eq('id', placeId)
    .maybeSingle();
  if (error) throw error;

  // Only a place that visitors can see can be reported
  if (!place || place.is_blocked || !PUBLIC_LEVELS.includes(effectiveLevel(place, date))) {
    throw new HttpError(404, 'not_found', 'המקום לא נמצא');
  }
  if (countOpen(place.reports) >= MAX_OPEN_REPORTS) throw tooMany();

  const report = {
    id: (deps.newId ?? randomUUID)(),
    created_at: (deps.now ?? (() => new Date().toISOString()))(),
    type,
    text,
    ai: null,
    status: 'open',
    status_at: null
  };

  // One conditional update in the database: two reports at the same moment cannot pass the limit
  const { data: added, error: rpcError } = await db.rpc('add_report', {
    p_place_id: placeId,
    p_report: report,
    p_max: MAX_OPEN_REPORTS
  });
  if (rpcError) throw rpcError;
  if (added !== true) throw tooMany();
  return {};
}
