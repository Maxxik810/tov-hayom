// הפונקציה היחידה: /api/trip?action=...
import { sendOk, sendError } from '../lib/http.js';
import { buildHome } from '../lib/home.js';

// לכל פעולה: השיטה שמותרת והקוד שמטפל בה
const ACTIONS = {
  home: { method: 'GET', run: async () => buildHome() }
};

export default async function handler(req, res) {
  const action = String(req.query?.action ?? '');
  const entry = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;

  if (!entry) {
    return sendError(res, 400, 'unknown_action', 'פעולה לא מוכרת');
  }
  if (req.method !== entry.method) {
    res.setHeader('Allow', entry.method);
    return sendError(res, 405, 'method_not_allowed', 'שיטה לא מתאימה לפעולה הזו');
  }

  try {
    const data = await entry.run(req);
    return sendOk(res, data);
  } catch (err) {
    console.error(`[trip:${action}]`, err);
    return sendError(res, 500, 'server_error', 'משהו השתבש. נסו שוב מאוחר יותר');
  }
}
