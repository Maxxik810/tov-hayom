// Tests for action "report" (lib/report.js). Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkReportInput, addReport, checkTriage, TYPE_IDS } from '../lib/report.js';

const ID = '11111111-1111-4111-8111-111111111111';
const today = new Date().toISOString().slice(0, 10);
const ok = { id: ID, name: 'מקום בדוי', category: 'museums', area: 'ashdod', verification_level: 'verified', last_verified_at: today, is_blocked: false, source_url: 'https://example.org/hours', reports: [] };
const ai = { type: 'hours', urgency: 'normal', summary: 'המשתמש טוען שהשעות שונות' };

function fake(place, rpcResult = true) {
  const calls = [];
  const db = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: place, error: null }) }) }) }),
    rpc: async (name, args) => { calls.push({ name, args }); return { data: rpcResult, error: null }; }
  };
  return { db, calls };
}
function run(body, { place = ok, rpcResult = true, triage = { ai }, hookStatus = 200 } = {}) {
  const f = fake(place, rpcResult);
  const hooks = [];
  let agent = 0;
  const deps = {
    db: f.db,
    classify: async () => { agent++; return triage; },
    fetchImpl: async (url, init) => { hooks.push(JSON.parse(init.body)); return { ok: hookStatus < 300, status: hookStatus }; }
  };
  return { promise: addReport(body, deps), f, hooks, agent: () => agent };
}

test.beforeEach(() => {
  process.env.N8N_WEBHOOK_URL = 'https://n8n.example/webhook/report';
  process.env.N8N_WEBHOOK_SECRET = 'test-secret';
});
test.after(() => { console.error = orig; });
const orig = console.error;
console.error = () => {};

test('report types match data/report-types.json', () => {
  const json = JSON.parse(readFileSync(new URL('../data/report-types.json', import.meta.url), 'utf8'));
  assert.deepEqual(json.map(t => t.id), TYPE_IDS);
});

test('bad input is 400', () => {
  for (const b of [null, [], {}, { place_id: 'x', type: 'hours' }, { place_id: ID, type: 'bad' },
    { place_id: ID, type: 'other' }, { place_id: ID, type: 'other', text: '   ' },
    { place_id: ID, type: 'hours', text: 'א'.repeat(301) }, { place_id: ID, type: 'hours', extra: 1 },
    { place_id: ID, type: 'hours', text: 5 }]) {
    assert.throws(() => checkReportInput(b), e => e.status === 400, JSON.stringify(b));
  }
  assert.deepEqual(checkReportInput({ place_id: ID, type: 'hours' }), { placeId: ID, type: 'hours', text: '' });
  assert.equal(checkReportInput({ place_id: ID, type: 'other', text: '  היי\u0000 ' }).text, 'היי');
  assert.equal(checkReportInput({ place_id: ID, type: 'hours', text: 'א'.repeat(300) }).text.length, 300);
});

test('saves with the agent result and calls the webhook', async () => {
  const r = run({ place_id: ID, type: 'closed', text: ' סגור לשיפוצים ' });
  await r.promise;
  assert.equal(r.f.calls.length, 1);
  const { name, args } = r.f.calls[0];
  assert.equal(name, 'add_report');
  assert.equal(args.p_max, 5);
  assert.equal(args.p_report.text, 'סגור לשיפוצים');
  assert.equal(args.p_report.status, 'open');
  assert.deepEqual(args.p_report.ai, ai);
  assert.equal(r.hooks.length, 1);
  assert.equal(r.hooks[0].source_url, 'https://example.org/hours');
});

test('hidden places are 404, without agent and without saving', async () => {
  for (const place of [null, { ...ok, is_blocked: true }, { ...ok, verification_level: 'unverified' }, { ...ok, verification_level: 'unsafe' }]) {
    const r = run({ place_id: ID, type: 'hours' }, { place });
    await assert.rejects(r.promise, e => e.status === 404);
    assert.equal(r.f.calls.length + r.hooks.length + r.agent(), 0);
  }
});

test('five open reports: 429, no agent, no email', async () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, status: 'open' }));
  const r = run({ place_id: ID, type: 'hours' }, { place: { ...ok, reports: five } });
  await assert.rejects(r.promise, e => e.status === 429 && e.code === 'too_many_reports');
  assert.equal(r.f.calls.length + r.hooks.length + r.agent(), 0);
  // handled reports do not count
  await run({ place_id: ID, type: 'hours' }, { place: { ...ok, reports: Array.from({ length: 7 }, () => ({ status: 'handled' })) } }).promise;
  // race: the database refuses
  const race = run({ place_id: ID, type: 'hours' }, { rpcResult: false });
  await assert.rejects(race.promise, e => e.status === 429);
  assert.equal(race.hooks.length, 0);
});

test('stale verified place shows as checked and can still be reported', async () => {
  const r = run({ place_id: ID, type: 'hours' }, { place: { ...ok, last_verified_at: '2026-01-01' } });
  await r.promise;
  assert.equal(r.f.calls.length, 1);
});

test('Gemini down: saved with ai = null', async () => {
  const r = run({ place_id: ID, type: 'hours' }, { triage: { ai: null, reason: 'timeout' } });
  await r.promise;
  assert.equal(r.f.calls[0].args.p_report.ai, null);
  assert.equal(r.hooks[0].ai, null);
});

test('webhook down or not configured: the user still gets success', async () => {
  await run({ place_id: ID, type: 'hours' }, { hookStatus: 500 }).promise;
  delete process.env.N8N_WEBHOOK_URL;
  const r = run({ place_id: ID, type: 'hours' });
  await r.promise;
  assert.equal(r.f.calls.length, 1);
  assert.equal(r.hooks.length, 0);
});

test('agent output check', () => {
  assert.equal(checkTriage(ai).valid, true);
  for (const bad of [null, { ...ai, type: 'x' }, { ...ai, urgency: 'high' }, { ...ai, summary: 'אב' }, { ...ai, summary: 'שורה\nשנייה ארוכה' }]) {
    assert.equal(checkTriage(bad).valid, false);
  }
});
