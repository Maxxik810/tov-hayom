// Uniform JSON responses. Every response has Cache-Control: no-store.
import { timingSafeEqual, createHash } from 'node:crypto';

export const MAX_BODY_BYTES = 2048;

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function sendOk(res, data = {}) {
  sendJson(res, 200, { ok: true, ...data });
}

// error: short English code. message: short Hebrew message. No provider details.
export function sendError(res, status, error, message) {
  sendJson(res, status, { ok: false, error, message });
}

// An error that the router turns into a JSON response with this status.
export class HttpError extends Error {
  constructor(status, code, message) {
    super(code);
    this.status = status;
    this.code = code;
    this.publicMessage = message;
  }
}

const tooLarge = () => new HttpError(413, 'body_too_large', 'הבקשה גדולה מדי');
const badJson = () => new HttpError(400, 'bad_json', 'הבקשה לא תקינה');

// Reads the JSON body with a size limit. An empty body becomes {}.
export async function readJsonBody(req) {
  let raw;
  if (req.body !== undefined && req.body !== null) {
    // Vercel may have read the body already
    raw = typeof req.body === 'string' ? req.body
      : Buffer.isBuffer(req.body) ? req.body.toString('utf8')
      : JSON.stringify(req.body);
  } else {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) throw tooLarge();
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) throw tooLarge();
  if (raw.trim() === '') return {};

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw badJson();
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw badJson();
  return body;
}

// Checks "Authorization: Bearer <AUTOMATION_SECRET>". Throws 401 when missing or wrong.
export function requireAutomationSecret(req) {
  const secret = process.env.AUTOMATION_SECRET;
  const header = String(req.headers?.authorization ?? '');
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Compare hashes so the lengths always match
  const hash = s => createHash('sha256').update(s).digest();
  if (!secret || !given || !timingSafeEqual(hash(given), hash(secret))) {
    throw new HttpError(401, 'unauthorized', 'אין הרשאה');
  }
}
