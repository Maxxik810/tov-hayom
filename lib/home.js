// פעולת home, גרסת השלד (Milestone 1): קוראת מ-Supabase כדי לוודא שהחיבור עובד,
// ומחזירה כרטיס ריק ומדף ריק. Milestone 2 מוסיף את הכרטיס והמדף האמיתיים.
import { getSupabase } from './supabase.js';
import { israelToday } from './date.js';

export async function buildHome() {
  const date = israelToday();
  const { error } = await getSupabase()
    .from('daily_cards')
    .select('card_date, place_id')
    .eq('card_date', date)
    .limit(1);
  if (error) throw error;
  return { date, today: null, shelf: [] };
}
