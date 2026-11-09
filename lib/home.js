// Action "home": today's card and the shelf. Only PublicPlace fields reach the browser.
import { getSupabase } from './supabase.js';
import { israelToday } from './date.js';
import { effectiveLevel, PUBLIC_LEVELS } from './level.js';

// Columns read from the table. google_place_id is read only to compute has_rating.
const PLACE_COLUMNS =
  'id, name, category, area, verification_level, last_verified_at, opening_hours, ' +
  'google_place_id, image_file, lat, lng, is_blocked';

const toNumber = v => (v === null || v === undefined ? null : Number(v));

// The public shape of a place, or null when it must not be shown on this date.
export function toPublicPlace(row, date) {
  if (!row || row.is_blocked) return null;
  const level = effectiveLevel(row, date);
  if (!PUBLIC_LEVELS.includes(level)) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    verification_level: level,
    last_verified_at: row.last_verified_at,
    opening_hours: row.opening_hours,
    has_rating: Boolean(row.google_place_id),
    image_file: row.image_file,
    lat: toNumber(row.lat),
    lng: toNumber(row.lng)
  };
}

// Shelf order: verified first, then checked; newest check first; ties by name.
export function sortShelf(places) {
  const rank = p => (p.verification_level === 'verified' ? 0 : 1);
  return places.sort((a, b) =>
    rank(a) - rank(b) ||
    (b.last_verified_at ?? '').localeCompare(a.last_verified_at ?? '') ||
    a.name.localeCompare(b.name, 'he')
  );
}

export async function buildHome() {
  const date = israelToday();
  const db = getSupabase();

  const [cardRes, placesRes] = await Promise.all([
    db.from('daily_cards')
      .select(`sentence, place:places(${PLACE_COLUMNS})`)
      .eq('card_date', date)
      .maybeSingle(),
    db.from('places')
      .select(PLACE_COLUMNS)
      .eq('is_blocked', false)
      .in('verification_level', PUBLIC_LEVELS)
  ]);
  if (cardRes.error) throw cardRes.error;
  if (placesRes.error) throw placesRes.error;

  // A blocked or downgraded place after the card was made: no recommendation today
  const todayPlace = toPublicPlace(cardRes.data?.place, date);
  const today = todayPlace ? { place: todayPlace, sentence: cardRes.data.sentence } : null;

  const shelf = sortShelf(
    placesRes.data
      .map(row => toPublicPlace(row, date))
      .filter(p => p && p.id !== todayPlace?.id)
  );

  return { date, today, shelf };
}
