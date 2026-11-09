# Tov Hayom (טוב היום)

כל יום מקום אחד מאומת, עם משפט קצר שמסביר למה שווה ללכת אליו, ומתחתיו מדף של מקומות נוספים. לכל מקום יש תג אימות ותאריך בדיקה.

**מצב נוכחי: Milestone 1, Walking Skeleton.** כל השכבות מחוברות, בלי פיצ'רים. המסך מציג רק את התשובה הגולמית של הפונקציה.
האב-טיפוס הקודם (נתוני דמה, בלי שרת) שמור בתגית `prototype`.

## הסטאק
- אתר סטטי: HTML, CSS ו-JavaScript, בלי כלי בנייה.
- Vercel: מגיש את הדפים ואת הפונקציה `api/trip.js`, באותה כתובת.
- Supabase: שלוש טבלאות נעולות. רק הפונקציה ניגשת אליהן, עם המפתח הסודי.

## הקמה

### 1. Supabase
1. פרויקט חדש ב-Supabase.
2. SQL Editor: מריצים את `supabase/schema.sql` פעם אחת.
3. בודקים ב-Table Editor: `places`, `daily_cards`, `source_log`, ובכל אחת RLS דולק, בלי policy.
4. אם Supabase מציע להוסיף policy או grant ל-`anon`, לא מקבלים.

### 2. Vercel
1. New Project, מייבאים את הריפו הזה. Framework Preset: Other. בלי Build Command.
2. משתני סביבה (Settings, Environment Variables):
   | שם | סוג | מאיפה |
   |---|---|---|
   | `SUPABASE_URL` | Config | Supabase, Project Settings, Data API |
   | `SUPABASE_SECRET_KEY` | Secret (Production, Preview) | Supabase, Project Settings, API Keys, מפתח `sb_secret_...` |
3. Redeploy אחרי כל שינוי במשתנה.

## בדיקה
- `GET /api/trip?action=home` מחזיר `{ "ok": true, "date": "<היום לפי שעון ישראל>", "today": null, "shelf": [] }`.
- `action` לא מוכר: 400. שיטה לא נכונה: 405. תמיד JSON, תמיד `Cache-Control: no-store`.

## מפתחות
אין אף מפתח בריפו. המפתחות הסודיים נשמרים רק ב-Vercel. `.env.example` מכיל רק את השמות.
