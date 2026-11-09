# Tov Hayom (טוב היום)

כל יום מקום אחד מאומת, עם משפט קצר שמסביר למה שווה ללכת אליו, ומתחתיו מדף של מקומות נוספים. לכל מקום יש תג אימות ותאריך בדיקה.

**מצב נוכחי: Milestone 2.** המסך הראשי עובד על נתונים אמיתיים: כרטיס "טיול היום", מדף "מקומות נוספים", תג אימות ותאריך, ו"אין לנו המלצה מאומתת להיום" כשאין כרטיס. המשפט בכרטיס הוא עדיין משפט תבנית (Gemini נכנס ב-Milestone 4).
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
5. מייבאים את `supabase/places.csv` לטבלה `places` (Table Editor, Import data from CSV).

### 2. Vercel
1. New Project, מייבאים את הריפו הזה. Framework Preset: Other. בלי Build Command.
2. משתני סביבה (Settings, Environment Variables):
   | שם | סוג | מאיפה |
   |---|---|---|
   | `SUPABASE_URL` | Config | Supabase, Project Settings, Data API |
   | `SUPABASE_SECRET_KEY` | Sensitive (Production) | Supabase, Project Settings, API Keys, מפתח `sb_secret_...` |
   | `AUTOMATION_SECRET` | Sensitive (Production) | מחרוזת אקראית ארוכה. אותה מחרוזת תיכנס ל-n8n |
3. Redeploy אחרי כל שינוי במשתנה.

## הפעולות
| `action` | שיטה | מה עושה |
|---|---|---|
| `home` | GET | הכרטיס של היום (לפי שעון ישראל) והמדף. רק מקומות מאומתים ונבדקים שלא חסומים |
| `daily` | POST | בוחר מקום ליום אחד וכותב אותו ל-`daily_cards` ול-`source_log`. דורש `Authorization: Bearer <AUTOMATION_SECRET>` |

יצירת כרטיס ידנית (PowerShell, הסוד נלקח ממשתנה ולא נכתב בפקודה):
```powershell
curl.exe -s -X POST "https://tov-hayom.vercel.app/api/trip?action=daily" -H "Authorization: Bearer $env:TOV_AUTOMATION_SECRET" -H "Content-Type: application/json" -d '{\"date\":\"2026-11-10\"}'
```
בלי `date`, הכרטיס נוצר למחר. כרטיס שכבר קיים לא משתנה (`created: false`).

## בדיקה
- `action` לא מוכר: 400. שיטה לא נכונה: 405. סוד חסר או שגוי: 401. תמיד JSON, תמיד `Cache-Control: no-store`.

## מפתחות
אין אף מפתח בריפו. המפתחות הסודיים נשמרים רק ב-Vercel. `.env.example` מכיל רק את השמות.
