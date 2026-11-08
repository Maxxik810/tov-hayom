// נתוני דמה לאב-טיפוס. אין כאן קריאה לשרת ואין מפתחות.
// המבנה זהה לקבצי data/*.json ולתשובת action=home ב-ARCHITECTURE.md.
// כל השעות, התאריכים, הדירוגים והמשפטים הם להמחשה בלבד ולא נבדקו מול מקור רשמי.
// הקובץ הוא JS ולא JSON כדי שהאתר ייפתח גם בלחיצה כפולה על index.html (בלי שרת).

window.TOV_MOCK = {
  // data/categories.json
  categories: [
    { id: "museums",         label: "מוזיאון" },
    { id: "parks",           label: "פארק" },
    { id: "theaters",        label: "תיאטרון" },
    { id: "nature_reserves", label: "שמורת טבע" },
    { id: "heritage_sites",  label: "אתר מורשת והיסטוריה" }
  ],

  // data/areas.json, לפי ARCHITECTURE.md: אזור אחד לכל אשדוד, ואזור לכל יישוב מחוץ לה.
  // הגבול: עד בית שמש וראשון לציון (לא כולל), ומדרום עד באר שבע (כולל).
  // הנחה: היישובים מחוץ לאשדוד נבחרו לאב-טיפוס בלבד.
  areas: [
    { id: "ashdod",     label: "אשדוד",    in_label: "באשדוד" },
    { id: "yavne",      label: "יבנה",     in_label: "ביבנה" },
    { id: "gedera",     label: "גדרה",     in_label: "בגדרה" },
    { id: "nitzanim",   label: "ניצנים",   in_label: "בניצנים" },
    { id: "ashkelon",   label: "אשקלון",   in_label: "באשקלון" },
    { id: "beer_sheva", label: "באר שבע",  in_label: "בבאר שבע" }
  ],

  // data/verification-levels.json (ההסבר לפי כלל "מאומת" ב-product-10-definitions.md)
  levels: [
    { id: "verified",   label: "מאומת",    explanation: "יש מקור רשמי למקום (האתר הרשמי שלו, רשות הטבע והגנים או העירייה), השעות זהות למקור, והבדיקה האחרונה לפני 90 יום לכל היותר." },
    { id: "checked",    label: "נבדק",     explanation: "שני מקורות ברשת לפחות, או אישור ידני של המנהל. גם מקום מאומת שלא נבדק שוב תוך 90 יום. מוצג עם תאריך." },
    { id: "unverified", label: "לא מאומת", explanation: "מקור יחיד, מידע סותר או חסר. לא מוצג." },
    { id: "unsafe",     label: "לא בטוח",  explanation: "מסומן כמסוכן או מפוקפק. לא מוצג." }
  ],

  // טבלת places (15 מקומות, 3 לכל קטגוריה). image_file ריק = אריח הקטגוריה.
  // image_credit: קרדיט לתמונה ברישיון חופשי מ-Wikimedia Commons. הנחה: שדה לאב-טיפוס, לא עמודה בטבלה.
  // mock_rating: רק לאב-טיפוס. במוצר הדירוג מגיע חי מ-Google Places ולא נשמר.
  places: [
    { id: "p01", name: "מוזיאון קורין ממן",       category: "museums", area: "ashdod", verification_level: "verified", last_verified_at: "2026-11-02", opening_hours: "א'-ה' 09:00-16:00, ו' 09:00-13:00", image_file: null, is_blocked: false, mock_rating: 4.5 },
    { id: "p02", name: "המוזיאון לאמנות אשדוד",  category: "museums", area: "ashdod", verification_level: "verified", last_verified_at: "2026-11-05", opening_hours: "א'-ה' 10:00-18:00, ו' 10:00-14:00", image_file: "ashdod-art-museum.jpg", image_credit: { author: "מקף־עברי", license: "CC0", source_url: "https://commons.wikimedia.org/wiki/File:%D7%9E%D7%95%D7%96%D7%99%D7%90%D7%95%D7%9F_%D7%90%D7%A9%D7%93%D7%95%D7%93_%D7%9C%D7%90%D7%9E%D7%A0%D7%95%D7%AA,_%D7%93%D7%A6%D7%9E%D7%91%D7%A8_2023_01.jpg" }, is_blocked: false, mock_rating: 4.4 },
    { id: "p03", name: "מוזיאון לדוגמה",          category: "museums", area: "yavne",  verification_level: "checked",  last_verified_at: "2026-10-20", opening_hours: null, image_file: null, is_blocked: false, mock_rating: 4.3 },

    { id: "p04", name: "פארק לכיש",      category: "parks", area: "ashdod", verification_level: "verified", last_verified_at: "2026-10-28", opening_hours: "פתוח כל השבוע, כל היום", image_file: null, is_blocked: false, mock_rating: 4.6 },
    { id: "p05", name: "הגן הלאומי אשקלון", category: "parks", area: "ashkelon", verification_level: "verified", last_verified_at: "2026-10-30", opening_hours: "פתוח כל השבוע, כל היום", image_file: "ashkelon-national-park.jpg", image_credit: { author: "israeltourism from Israel", license: "CC BY 2.0", source_url: "https://commons.wikimedia.org/wiki/File:Ashkelon_National_Park_(5616112114).jpg" }, is_blocked: false, mock_rating: null },
    { id: "p06", name: "פארק אשדוד ים",  category: "parks", area: "ashdod", verification_level: "verified", last_verified_at: "2026-07-20", opening_hours: "פתוח כל השבוע, כל היום", image_file: "ashdod-yam-park.jpg", image_credit: { author: "מקף־עברי", license: "CC0", source_url: "https://commons.wikimedia.org/wiki/File:%D7%94%D7%90%D7%92%D7%9D_%D7%94%D7%9E%D7%9C%D7%90%D7%9B%D7%95%D7%AA%D7%99_%D7%91%D7%A4%D7%90%D7%A8%D7%A7_%D7%90%D7%A9%D7%93%D7%95%D7%93-%D7%99%D7%9D,_%D7%A4%D7%91%D7%A8%D7%95%D7%90%D7%A8_2024.jpg" }, is_blocked: false, mock_rating: 4.6 },

    { id: "p07", name: "המשכן לאמנויות הבמה אשדוד", category: "theaters", area: "ashdod", verification_level: "verified", last_verified_at: "2026-11-01", opening_hours: "קופה: א'-ה' 10:00-19:00", image_file: "ashdod-performing-arts.jpg", image_credit: { author: "מקף־עברי", license: "CC0", source_url: "https://commons.wikimedia.org/wiki/File:%D7%94%D7%9E%D7%A9%D7%9B%D7%9F_%D7%9C%D7%90%D7%9E%D7%A0%D7%95%D7%99%D7%95%D7%AA_%D7%94%D7%91%D7%9E%D7%94_%D7%91%D7%90%D7%A9%D7%93%D7%95%D7%93,_%D7%93%D7%A6%D7%9E%D7%91%D7%A8_2023_01.jpg" }, is_blocked: false, mock_rating: 4.6 },
    { id: "p08", name: "תיאטרון לדוגמה",            category: "theaters", area: "yavne",  verification_level: "verified", last_verified_at: "2026-10-25", opening_hours: "קופה: א'-ה' 10:00-19:00", image_file: null, is_blocked: false, mock_rating: 4.4 },
    { id: "p09", name: "אולם מופעים לדוגמה",        category: "theaters", area: "ashdod", verification_level: "verified", last_verified_at: "2026-10-22", opening_hours: "קופה: א'-ה' 10:00-19:00", image_file: null, is_blocked: true,  mock_rating: 4.5 },

    { id: "p10", name: "שמורת חולות ניצנים", category: "nature_reserves", area: "nitzanim", verification_level: "verified",   last_verified_at: "2026-11-06", opening_hours: "א'-ה' 08:00-17:00, ו' 08:00-16:00", image_file: "nitzanim-dunes.jpg", image_credit: { author: "אריאל מדינה", license: "CC BY-SA 4.0", source_url: "https://commons.wikimedia.org/wiki/File:Nitzanim_nature_reserve,_September_2017,_Ariel_Medina_-2.jpg" }, is_blocked: false, mock_rating: 4.6 },
    { id: "p11", name: "שמורת טבע לדוגמה",   category: "nature_reserves", area: "ashkelon", verification_level: "checked",    last_verified_at: "2026-10-15", opening_hours: "א'-ה' 08:00-16:00", image_file: null, is_blocked: false, mock_rating: 4.4 },
    { id: "p12", name: "שמורת נחל לדוגמה",   category: "nature_reserves", area: "yavne", verification_level: "unverified", last_verified_at: null,         opening_hours: null, image_file: null, is_blocked: false, mock_rating: null },

    { id: "p13", name: "מצודת אשדוד ים",   category: "heritage_sites", area: "ashdod", verification_level: "verified", last_verified_at: "2026-10-18", opening_hours: "פתוח כל השבוע, כל היום", image_file: "ashdod-yam-fortress.jpg", image_credit: { author: "מקף־עברי", license: "CC BY-SA 4.0", source_url: "https://commons.wikimedia.org/wiki/File:Ashdod_Yam_Fortress_at_sunset,_23_September_2025_06.jpg" }, is_blocked: false, mock_rating: 4.5 },
    { id: "p14", name: "תל באר שבע",       category: "heritage_sites", area: "beer_sheva",  verification_level: "checked",  last_verified_at: "2026-10-12", opening_hours: null, image_file: "tel-beer-sheva.jpg", image_credit: { author: "Mboesch", license: "CC BY-SA 4.0", source_url: "https://commons.wikimedia.org/wiki/File:Tel-beer-sheva-uebersicht.JPG" }, is_blocked: false, mock_rating: 4.3 },
    { id: "p15", name: "אתר מורשת לדוגמה", category: "heritage_sites", area: "gedera", verification_level: "unsafe",   last_verified_at: "2026-10-10", opening_hours: null, image_file: null, is_blocked: false, mock_rating: null }
  ],

  // שורה מטבלת daily_cards: הכרטיס של היום. במוצר n8n יוצר אותה כל ערב.
  daily_card: {
    place_id: "p01",
    sentence: "מוזיאון באשדוד שמציג ממצאים מתרבות הפלשתים, שחיו באזור לפני אלפי שנים."
  }
};
