// Action "daily": picks the place for one date, writes the card and the run log.
// Never changes a card that already exists.
import { getSupabase } from './supabase.js';
import { israelToday, addDays, isDateString } from './date.js';
import { pickPlace } from './pick.js';
import { sentenceForPlace } from './sentence.js';
import { HttpError } from './http.js';

const LOG_SOURCE = 'daily_card';

async function writeLog(db, success, message) {
  const { error } = await db.from('source_log').upsert({
    source: LOG_SOURCE,
    last_run_at: new Date().toISOString(),
    success,
    message
  });
  if (error) console.error('[daily] source_log write failed', error);
}

// Map of place id -> the last date it was shown
export function lastShownByPlace(rows) {
  const map = new Map();
  for (const row of rows) {
    const prev = map.get(row.place_id);
    if (!prev || row.card_date > prev) map.set(row.place_id, row.card_date);
  }
  return map;
}

export async function runDaily(body) {
  if (Object.keys(body).some(k => k !== 'date')) {
    throw new HttpError(400, 'bad_input', 'שדה לא מוכר בבקשה');
  }
  if (body.date !== undefined && !isDateString(body.date)) {
    throw new HttpError(400, 'bad_date', 'תאריך לא תקין');
  }
  // The evening run sends no date: the card is for tomorrow
  const date = body.date ?? addDays(israelToday(), 1);
  const db = getSupabase();

  try {
    // 1. A card for this date already exists: return it untouched
    const existing = await db.from('daily_cards')
      .select('place_id').eq('card_date', date).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      return { date, place_id: existing.data.place_id, created: false };
    }

    // 2. Candidates and history
    const [placesRes, historyRes] = await Promise.all([
      db.from('places')
        .select('id, name, category, area, opening_hours, verification_level, last_verified_at, is_blocked')
        .eq('is_blocked', false),
      db.from('daily_cards')
        .select('card_date, place_id').lt('card_date', date)
    ]);
    if (placesRes.error) throw placesRes.error;
    if (historyRes.error) throw historyRes.error;

    // 3. Pick
    const place = pickPlace(placesRes.data, lastShownByPlace(historyRes.data), date);
    if (!place) {
      await writeLog(db, true, `${date}: אין מקום מאומת, לא נוצר כרטיס`);
      return { date, place_id: null, created: false };
    }

    // 4. Sentence from Gemini, or the template when Gemini fails or the sentence is rejected
    const { sentence, source, reason } = await sentenceForPlace(place);
    const insert = await db.from('daily_cards')
      .insert({ card_date: date, place_id: place.id, sentence });
    if (insert.error) {
      // Two runs at the same moment: the other one already wrote the card
      if (insert.error.code === '23505') {
        const again = await db.from('daily_cards')
          .select('place_id').eq('card_date', date).single();
        if (again.error) throw again.error;
        return { date, place_id: again.data.place_id, created: false };
      }
      throw insert.error;
    }

    const why = source === 'template' ? ` (${reason})` : '';
    await writeLog(db, true, `${date}: נבחר ${place.name}, משפט: ${source}${why}`);
    return { date, place_id: place.id, sentence_source: source, created: true };
  } catch (err) {
    await writeLog(db, false, `${date}: error ${err?.code ?? 'unknown'}`);
    throw err;
  }
}
