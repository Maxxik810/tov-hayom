import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateReport, submitReport, REPORT_TYPES } from '../lib/report.js';
const ID = '11111111-1111-4111-8111-111111111111';
const fake = (place, rpcResult = true) => {
  const calls = [];
  return { calls, db: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: place, error: null }) }) }) }),
    rpc: async (n, a) => { calls.push([n, a]); return { data: rpcResult, error: null }; } } };
};
const ok = { id: ID, is_blocked: false, verification_level: 'verified', last_verified_at: '2026-11-10', reports: [] };
test('types equal json', () => {
  assert.deepEqual(JSON.parse(readFileSync(new URL('../data/report-types.json', import.meta.url),'utf8')).map(t=>t.id), REPORT_TYPES);
});
test('validation', () => {
  for (const b of [null, [], {}, {place_id:'x',type:'hours'}, {place_id:ID,type:'bad'}, {place_id:ID,type:'other'}, {place_id:ID,type:'other',text:'   '}, {place_id:ID,type:'hours',text:'א'.repeat(301)}, {place_id:ID,type:'hours',extra:1}, {place_id:ID,type:'hours',text:5}])
    assert.throws(() => validateReport(b), e => e.status === 400);
  assert.deepEqual(validateReport({place_id:ID,type:'hours'}), {place_id:ID,type:'hours',text:''});
  assert.equal(validateReport({place_id:ID,type:'other',text:'  היי\u0000 '}).text, 'היי');
  assert.equal(validateReport({place_id:ID,type:'hours',text:'א'.repeat(300)}).text.length, 300);
});
test('saves', async () => {
  const f = fake(ok);
  await submitReport({place_id:ID,type:'closed',text:'סגור'}, { db: f.db, date:'2026-11-15', newId:()=>'rid', now:()=>'T' });
  assert.equal(f.calls[0][0], 'add_report');
  assert.deepEqual(f.calls[0][1], {p_place_id:ID, p_max:5, p_report:{id:'rid',created_at:'T',type:'closed',text:'סגור',ai:null,status:'open',status_at:null}});
});
test('hidden places 404', async () => {
  for (const p of [null, {...ok,is_blocked:true}, {...ok,verification_level:'unverified'}, {...ok,verification_level:'unsafe'}])
    await assert.rejects(submitReport({place_id:ID,type:'hours'}, {db: fake(p).db, date:'2026-11-15'}), e => e.status === 404);
});
test('limit', async () => {
  const five = Array.from({length:5},()=>({status:'open'}));
  await assert.rejects(submitReport({place_id:ID,type:'hours'}, {db: fake({...ok,reports:five}).db, date:'2026-11-15'}), e => e.status===429 && e.code==='too_many_reports');
  // closed reports do not count
  const f = fake({...ok,reports:Array.from({length:7},()=>({status:'handled'}))});
  await submitReport({place_id:ID,type:'hours'}, {db:f.db, date:'2026-11-15'});
  // race: db says not added
  await assert.rejects(submitReport({place_id:ID,type:'hours'}, {db: fake(ok,false).db, date:'2026-11-15'}), e => e.status===429);
});
test('stale verified shows as checked, still reportable', async () => {
  const f = fake({...ok,last_verified_at:'2026-01-01'});
  await submitReport({place_id:ID,type:'hours'}, {db:f.db, date:'2026-11-15'});
  assert.equal(f.calls.length,1);
});
