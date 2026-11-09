// תשובות JSON אחידות. כל תשובה עם Cache-Control: no-store.

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function sendOk(res, data = {}) {
  sendJson(res, 200, { ok: true, ...data });
}

// error: קוד קצר באנגלית. message: הודעה קצרה בעברית. בלי פרטים של ספק.
export function sendError(res, status, error, message) {
  sendJson(res, status, { ok: false, error, message });
}
