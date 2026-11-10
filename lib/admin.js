// Admin actions: admin_list (all places) and admin_update (edit one place, including is_blocked).
// No insert and no delete: new places come in through a CSV in the Supabase dashboard.
import { getSupabase } from './supabase.js';
import { israelToday, isDateString } from './date.js';
import { category, area } from './lists.js';
import { HttpError } from './http.js';
import levels from '../data/verification-levels.json' with { type: 'json' };

const LEVEL_IDS = new Set(levels.map(l => l.id));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_FILE = /^[a-z0-9-]+\.(jpg|webp)$/;

const bad = (message, code = 'bad_input') => new HttpError(400, code, message);

// Optional text: empty becomes null, longer than max is rejected
function optionalText(max, label) {
  return v => {
    if (v === null) return null;
    if (typeof v !== 'string') throw bad(`${label}: ערך לא תקין`);
    const s = v.trim();
    if (s.length > max) throw bad(`${label}: ארוך מדי`);
    return s === '' ? null : s;
  };
}

function coordinate(min, max, label) {
  return v => {
    if (v === null) return null;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      throw bad(`${label}: ערך לא תקין`);
    }
    return Math.round(v * 1e6) / 1e6;
  };
}

// The only columns the admin may edit, each with its check
const EDITABLE = {
  name: v => {
    if (typeof v !== 'string' || v.trim() === '' || v.trim().length > 120) throw bad('שם: חובה, עד 120 תווים');
    return v.trim();
  },
  category: v => {
    if (!category(v)) throw bad('קטגוריה לא מוכרת');
    return v;
  },
  area: v => {
    if (!area(v)) throw bad('אזור לא מוכר');
    return v;
  },
  lat: coordinate(-90, 90, 'קו רוחב'),
  lng: coordinate(-180, 180, 'קו אורך'),
  verification_level: v => {
    if (!LEVEL_IDS.has(v)) throw bad('רמת אימות לא מוכרת');
    return v;
  },
  last_verified_at: v => {
    if (v === null || v === '') return null;
    if (!isDateString(v)) throw bad('תאריך בדיקה לא תקין');
    if (v > israelToday()) throw bad('תאריך הבדיקה לא יכול להיות בעתיד');
    return v;
  },
  verification_source: optionalText(300, 'מקור האימות'),
  source_url: v => {
    const s = optionalText(500, 'קישור למקור')(v);
    if (s === null) return null;
    let url;
    try { url = new URL(s); } catch { throw bad('הקישור למקור חייב להתחיל ב-https://'); }
    if (url.protocol !== 'https:' || !s.startsWith('https://')) throw bad('הקישור למקור חייב להתחיל ב-https://');
    return s;
  },
  is_blocked: v => {
    if (typeof v !== 'boolean') throw bad('ערך חסימה לא תקין');
    return v;
  },
  opening_hours: optionalText(300, 'שעות פתיחה'),
  google_place_id: optionalText(300, 'Google Place ID'),
  image_file: v => {
    const s = optionalText(100, 'קובץ תמונה')(v);
    if (s !== null && !IMAGE_FILE.test(s)) throw bad('קובץ תמונה: אותיות קטנות באנגלית, ספרות ומקף, וסיומת jpg או webp');
    return s;
  }
};

// Hebrew messages for the table checks (schema.sql)
const CHECK_MESSAGES = {
  places_verified_date_check: 'לרמה "מאומת" או "נבדק" צריך תאריך בדיקה',
  places_level_check: 'רמת אימות לא מוכרת',
  places_category_check: 'קטגוריה לא מוכרת',
  places_area_check: 'אזור לא מוכר',
  places_image_file_check: 'שם קובץ התמונה לא תקין',
  places_source_url_check: 'הקישור למקור חייב להתחיל ב-https://'
};

export async function adminList() {
  const date = israelToday();
  const db = getSupabase();
  const [placesRes, cardRes] = await Promise.all([
    db.from('places').select('*').order('name'),
    db.from('daily_cards').select('place_id').eq('card_date', date).maybeSingle()
  ]);
  if (placesRes.error) throw placesRes.error;
  if (cardRes.error) throw cardRes.error;
  return { date, today_place_id: cardRes.data?.place_id ?? null, places: placesRes.data };
}

export async function adminUpdate(body) {
  if (Object.keys(body).some(k => k !== 'id' && k !== 'fields')) throw bad('שדה לא מוכר בבקשה');
  const { id, fields } = body;
  if (typeof id !== 'string' || !UUID.test(id)) throw bad('מזהה מקום לא תקין');
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) throw bad('אין שדות לעדכון');

  const keys = Object.keys(fields);
  if (keys.length === 0) throw bad('אין שדות לעדכון');
  const changes = {};
  for (const key of keys) {
    if (!Object.hasOwn(EDITABLE, key)) throw bad(`אסור לערוך את השדה ${key}`, 'field_not_allowed');
    changes[key] = EDITABLE[key](fields[key]);
  }

  const { data, error } = await getSupabase()
    .from('places')
    .update(changes)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    // 23514 = a check in the table failed
    if (error.code === '23514') {
      const name = Object.keys(CHECK_MESSAGES).find(n => error.message?.includes(n));
      throw bad(CHECK_MESSAGES[name] ?? 'אחד הערכים לא תקין', 'check_failed');
    }
    throw error;
  }
  // Make sure the row was really updated
  if (!data) throw new HttpError(404, 'not_found', 'המקום לא נמצא');
  return { place: data };
}
