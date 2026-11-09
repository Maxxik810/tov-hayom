// Effective verification level: a "verified" place not checked for 90 days shows as "checked".
// The stored value in the table never changes.
import { addDays } from './date.js';

export const MAX_VERIFIED_AGE_DAYS = 90;
export const PUBLIC_LEVELS = ['verified', 'checked'];

export function effectiveLevel(place, date) {
  if (place.verification_level !== 'verified') return place.verification_level;
  const oldestAllowed = addDays(date, -MAX_VERIFIED_AGE_DAYS);
  if (!place.last_verified_at || place.last_verified_at < oldestAllowed) return 'checked';
  return 'verified';
}
