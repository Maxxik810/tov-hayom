-- Sample reports for testing the admin screen (F23), Milestone 5.
-- Fictional places only (ARCHITECTURE.md: no fictional report on a real place).
-- The places are blocked and "unverified", so they never reach the user screen or the daily card.
-- Safe to run twice (fixed ids). To remove: delete from public.places where name like 'מקום בדוי לבדיקה%';

insert into public.places (id, name, category, area, verification_level, is_blocked, source_url, reports)
values
  ('5a3e0000-0000-4000-8000-000000000001', 'מקום בדוי לבדיקה 1', 'museums', 'ashdod', 'unverified', true,
   'https://example.org/hours',
   jsonb_build_array(
     jsonb_build_object('id', '5a3e0000-0000-4000-8000-0000000000a1', 'created_at', '2026-11-15T08:10:00Z',
       'type', 'closed', 'text', 'הגעתי והשער היה נעול, יש שלט שהמקום סגור לשיפוצים',
       'ai', jsonb_build_object('type', 'closed', 'urgency', 'urgent', 'summary', 'המשתמש טוען שהמקום סגור לשיפוצים.'),
       'status', 'open', 'status_at', null),
     jsonb_build_object('id', '5a3e0000-0000-4000-8000-0000000000a2', 'created_at', '2026-11-14T16:30:00Z',
       'type', 'hours', 'text', 'בשישי פתוח רק עד 13:00 ולא עד 14:00',
       'ai', jsonb_build_object('type', 'hours', 'urgency', 'normal', 'summary', 'המשתמש טוען ששעת הסגירה בשישי היא 13:00.'),
       'status', 'open', 'status_at', null))),
  ('5a3e0000-0000-4000-8000-000000000002', 'מקום בדוי לבדיקה 2', 'leisure', 'ashkelon', 'unverified', true,
   null,
   jsonb_build_array(
     jsonb_build_object('id', '5a3e0000-0000-4000-8000-0000000000b1', 'created_at', '2026-11-13T11:00:00Z',
       'type', 'other', 'text', 'החניה בתשלום ולא חינם',
       'ai', null,
       'status', 'open', 'status_at', null)))
on conflict (id) do nothing;
