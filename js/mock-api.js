// מחליף זמנית את הפונקציה api/trip.js. מחשב את אותה תשובה של action=home
// מתוך נתוני הדמה, לפי הכללים ב-ARCHITECTURE.md. כשיהיה שרת, רק הקובץ הזה מתחלף.

(function () {
  const VERIFIED_MAX_DAYS = 90; // כלל "מאומת": בדיקה לפני 90 יום לכל היותר

  // התאריך של היום בשעון ישראל, בפורמט yyyy-mm-dd
  function israelToday() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  }

  function daysBetween(fromIso, toIso) {
    return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);
  }

  // מאומת שלא נבדק 90 יום יורד ל"נבדק". הערך השמור לא משתנה.
  function effectiveLevel(place, today) {
    if (place.verification_level === "verified" && place.last_verified_at &&
        daysBetween(place.last_verified_at, today) > VERIFIED_MAX_DAYS) {
      return "checked";
    }
    return place.verification_level;
  }

  // רק מה שהמסך צריך (PublicPlace)
  function toPublic(place, today) {
    return {
      id: place.id,
      name: place.name,
      category: place.category,
      area: place.area,
      verification_level: effectiveLevel(place, today),
      last_verified_at: place.last_verified_at,
      opening_hours: place.opening_hours,
      has_rating: place.mock_rating != null,
      image_file: place.image_file
    };
  }

  function isShown(place, today) {
    const level = effectiveLevel(place, today);
    return !place.is_blocked && (level === "verified" || level === "checked");
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // state: "normal" | "empty" | "error" | "loading" (רק להדגמת מצבים באב-טיפוס)
  async function home(state) {
    if (state === "loading") return new Promise(() => {}); // לא עונה אף פעם
    await wait(600); // הדמיה של זמן תגובה
    if (state === "error") return { ok: false, error: "server_error", message: "משהו השתבש" };

    const data = window.TOV_MOCK;
    const D = israelToday();
    const card = data.daily_card;
    const todayPlace = data.places.find(p => p.id === card.place_id);

    // היום מוצג רק אם המקום לא חסום והרמה האפקטיבית שלו מאומת או נבדק
    let today = null;
    if (state !== "empty" && todayPlace && isShown(todayPlace, D)) {
      today = { place: toPublic(todayPlace, D), sentence: card.sentence };
    }

    const rank = { verified: 0, checked: 1 };
    const shelf = data.places
      .filter(p => isShown(p, D) && (!today || p.id !== today.place.id))
      .map(p => toPublic(p, D))
      .sort((a, b) =>
        rank[a.verification_level] - rank[b.verification_level] ||
        b.last_verified_at.localeCompare(a.last_verified_at) ||
        a.name.localeCompare(b.name, "he"));

    return { ok: true, date: D, today, shelf };
  }

  // action=rating. במוצר: קריאה חיה ל-Google Places. כאן: ערך דמה.
  async function rating(placeId) {
    await wait(700);
    const p = window.TOV_MOCK.places.find(x => x.id === placeId);
    return { ok: true, rating: p ? p.mock_rating : null };
  }

  window.TovApi = { home, rating };
})();
