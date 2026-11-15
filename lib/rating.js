// Action "rating": the Google Maps rating of one place, read live.
// The browser sends only our place_id (UUID), never a Google id, so the function cannot be used to look up other places.
// The rating is never stored, never logged and never sent to Gemini.
import { getSupabase } from './supabase.js';
import { HttpError } from './http.js';
import { PUBLIC_LEVELS } from './level.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMEOUT_MS = 5_000;
const PLACES_API = 'https://places.googleapis.com/v1/places';

// Calls Google Places (New) with FieldMask "rating" only. Returns a number or null. Throws on failure.
export async function fetchGoogleRating(googlePlaceId, { fetchImpl = fetch } = {}) {
  const key = process.env.PLACES_API_KEY;
  if (!key) throw new Error('no_key');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${PLACES_API}/${encodeURIComponent(googlePlaceId)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating' }
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const data = await res.json();
    const r = data?.rating;
    return typeof r === 'number' && Number.isFinite(r) && r >= 0 && r <= 5 ? r : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getRating(placeId, deps = {}) {
  if (typeof placeId !== 'string' || !UUID.test(placeId)) {
    throw new HttpError(400, 'bad_place_id', 'מזהה מקום לא תקין');
  }

  const db = deps.db ?? getSupabase();
  const { data, error } = await db
    .from('places')
    .select('google_place_id, is_blocked, verification_level')
    .eq('id', placeId)
    .maybeSingle();
  if (error) throw error;

  // A blocked, hidden or missing place gets no rating
  if (!data || data.is_blocked || !PUBLIC_LEVELS.includes(data.verification_level)) {
    throw new HttpError(404, 'not_found', 'המקום לא נמצא');
  }
  if (!data.google_place_id) return { rating: null };

  try {
    return { rating: await fetchGoogleRating(data.google_place_id, deps) };
  } catch (err) {
    // Only a short code goes to the log: no key, no Google id, no rating
    console.error('[rating] google failed', err?.name === 'AbortError' ? 'timeout' : err?.message ?? 'unknown');
    throw new HttpError(502, 'rating_unavailable', 'אין לנו מידע');
  }
}
