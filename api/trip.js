// The only function: /api/trip?action=...
import { sendOk, sendError, HttpError, readJsonBody, requireAutomationSecret } from '../lib/http.js';
import { buildHome } from '../lib/home.js';
import { runDaily } from '../lib/daily.js';
import { runSimulate } from '../lib/simulate.js';
import { runAiTest } from '../lib/aitest.js';
import { requireAdmin } from '../lib/auth.js';
import { adminList, adminUpdate } from '../lib/admin.js';

// For each action: the allowed method and the code that handles it
const ACTIONS = {
  home: { method: 'GET', run: async () => buildHome() },
  daily: {
    method: 'POST',
    run: async req => {
      requireAutomationSecret(req);
      return runDaily(await readJsonBody(req));
    }
  },
  simulate: {
    method: 'POST',
    run: async req => {
      requireAutomationSecret(req);
      return runSimulate(await readJsonBody(req));
    }
  },
  ai_test: {
    method: 'POST',
    run: async req => {
      requireAutomationSecret(req);
      return runAiTest(await readJsonBody(req));
    }
  },
  admin_list: {
    method: 'GET',
    run: async req => {
      await requireAdmin(req);
      return adminList();
    }
  },
  admin_update: {
    method: 'POST',
    run: async req => {
      await requireAdmin(req);
      return adminUpdate(await readJsonBody(req));
    }
  }
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
    if (err instanceof HttpError) {
      return sendError(res, err.status, err.code, err.publicMessage);
    }
    console.error(`[trip:${action}]`, err);
    return sendError(res, 500, 'server_error', 'משהו השתבש. נסו שוב מאוחר יותר');
  }
}
