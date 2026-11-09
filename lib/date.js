// המקום היחיד בקוד שמחשב "היום". מחזיר YYYY-MM-DD לפי שעון ישראל.
export function israelToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now);
}
