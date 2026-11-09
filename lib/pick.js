// The "trip of the day" query. Pure function: no network, no clock. "date" is a parameter.
// Rules (PRD): effective level verified, not blocked, not shown in the 14 days before date,
// otherwise the verified place shown longest ago. Sorting by last shown date covers both rules.
import { effectiveLevel } from './level.js';

// places: rows with id, verification_level, last_verified_at, is_blocked
// lastShownByPlace: Map of place id -> last card_date before date (YYYY-MM-DD)
export function pickPlace(places, lastShownByPlace, date) {
  const candidates = places.filter(
    p => !p.is_blocked && effectiveLevel(p, date) === 'verified'
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const la = lastShownByPlace.get(a.id) ?? '';
    const lb = lastShownByPlace.get(b.id) ?? '';
    if (la !== lb) return la < lb ? -1 : 1; // never shown ('') comes first
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return candidates[0];
}
