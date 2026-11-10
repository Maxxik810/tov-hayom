// Action "simulate": runs the daily pick for N days in memory, without writing anything.
// Success criterion 2: 14 days with repeats = 0.
import { getSupabase } from './supabase.js';
import { israelToday, addDays, isDateString } from './date.js';
import { pickPlace } from './pick.js';
import { lastShownByPlace } from './daily.js';
import { HttpError } from './http.js';

const MAX_DAYS = 30;
const WINDOW_DAYS = 14;

export async function runSimulate(body) {
  if (Object.keys(body).some(k => k !== 'start' && k !== 'days')) {
    throw new HttpError(400, 'bad_input', 'שדה לא מוכר בבקשה');
  }
  if (body.start !== undefined && !isDateString(body.start)) {
    throw new HttpError(400, 'bad_date', 'תאריך לא תקין');
  }
  const days = body.days ?? 14;
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new HttpError(400, 'bad_days', 'מספר הימים צריך להיות בין 1 ל-30');
  }
  const start = body.start ?? addDays(israelToday(), 1);
  const db = getSupabase();

  // Read once
  const [placesRes, historyRes] = await Promise.all([
    db.from('places')
      .select('id, name, verification_level, last_verified_at, is_blocked')
      .eq('is_blocked', false),
    db.from('daily_cards').select('card_date, place_id').lt('card_date', start)
  ]);
  if (placesRes.error) throw placesRes.error;
  if (historyRes.error) throw historyRes.error;

  const shown = lastShownByPlace(historyRes.data);
  const picked = new Map();
  const picks = [];
  let repeats = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const place = pickPlace(placesRes.data, shown, date);
    if (!place) {
      picks.push({ date, place_id: null, name: null });
      continue;
    }
    // A repeat: the place was already picked in this simulation, in the 14 days before this date
    // (PRD success criterion 2: "in a 14-day simulation no place repeats")
    const last = picked.get(place.id);
    if (last && last >= addDays(date, -WINDOW_DAYS)) repeats++;
    picked.set(place.id, date);
    shown.set(place.id, date);
    picks.push({ date, place_id: place.id, name: place.name });
  }
  const distinct = new Set(picks.filter(p => p.place_id).map(p => p.place_id)).size;
  return { start, days, picks, repeats, distinct_places: distinct };
}
