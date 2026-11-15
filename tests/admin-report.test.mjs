// Tests for action "admin_report" (lib/admin.js). Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { adminReport } from '../lib/admin.js';

const PLACE = '11111111-1111-4111-8111-111111111111';
const REPORT = '22222222-2222-4222-8222-222222222222';

function fakeDb({ found = true, place = { id: PLACE, reports: [] }, rpcError = null } = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => { calls.push({ name, args }); return { data: rpcError ? null : found, error: rpcError }; },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: place, error: null }) }) }) })
  };
}
const body = (o = {}) => ({ place_id: PLACE, report_id: REPORT, status: 'handled', ...o });
const rejectsWith = (p, status, code) => assert.rejects(p, e => e.status === status && (!code || e.code === code));

test('handled: calls set_report_status and returns the row', async () => {
  const db = fakeDb();
  const res = await adminReport(body(), db);
  assert.deepEqual(db.calls, [{ name: 'set_report_status', args: { p_place_id: PLACE, p_report_id: REPORT, p_status: 'handled' } }]);
  assert.equal(res.place.id, PLACE);
});

test('rejected is allowed too', async () => {
  const db = fakeDb();
  await adminReport(body({ status: 'rejected' }), db);
  assert.equal(db.calls[0].args.p_status, 'rejected');
});

test('bad input: 400 and no database call', async () => {
  for (const b of [null, [], body({ status: 'open' }), body({ status: 'deleted' }), body({ place_id: 'x' }),
    body({ report_id: '1 or 1=1' }), body({ extra: 1 }), { place_id: PLACE, report_id: REPORT }]) {
    const db = fakeDb();
    await rejectsWith(adminReport(b, db), 400);
    assert.equal(db.calls.length, 0);
  }
});

test('report not found: 404', async () => {
  await rejectsWith(adminReport(body(), fakeDb({ found: false })), 404, 'not_found');
});

test('database error is passed on (becomes 500)', async () => {
  await assert.rejects(adminReport(body(), fakeDb({ rpcError: { message: 'boom' } })), e => e.message === 'boom');
});
