-- Tov Hayom: מבנה בסיס הנתונים (ARCHITECTURE.md, סעיפים 2 ו-3)
-- מריצים פעם אחת ב-SQL Editor של Supabase.
-- הטבלאות נעולות: RLS דולק בלי אף policy, אין הרשאות ל-anon ול-authenticated.
-- רק הפונקציה ב-Vercel (service_role) ניגשת אליהן.

-- ---------- places ----------
create table public.places (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text not null,
  area                text not null,
  lat                 numeric(9,6),
  lng                 numeric(9,6),
  verification_level  text not null default 'unverified',
  last_verified_at    date,
  verification_source text,
  source_url          text,
  is_blocked          boolean not null default false,
  opening_hours       text,
  google_place_id     text,
  image_file          text,
  reports             jsonb not null default '[]'::jsonb,
  updated_at          timestamptz not null default now(),

  constraint places_level_check
    check (verification_level in ('verified','checked','unverified','unsafe')),
  constraint places_category_check
    check (category in ('museums','nature_parks','theaters','heritage_sites','leisure')),
  constraint places_area_check
    check (area in ('ashdod','nitzanim','ashkelon','beer_sheva','latrun')),
  constraint places_verified_date_check
    check (verification_level in ('unverified','unsafe') or last_verified_at is not null),
  constraint places_image_file_check
    check (image_file is null or image_file ~ '^[a-z0-9-]+\.(jpg|webp)$'),
  constraint places_source_url_check
    check (source_url is null or source_url ~ '^https://'),
  constraint places_reports_array_check
    check (jsonb_typeof(reports) = 'array')
);

-- updated_at מתעדכן בכל UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

-- ---------- daily_cards ----------
create table public.daily_cards (
  card_date  date primary key,
  place_id   uuid not null references public.places(id) on delete restrict,
  sentence   text not null,
  created_at timestamptz not null default now()
);

create index daily_cards_place_id_idx on public.daily_cards (place_id);

-- ---------- source_log ----------
create table public.source_log (
  source      text primary key,
  last_run_at timestamptz not null,
  success     boolean not null,
  message     text
);

-- ---------- נעילה ----------
alter table public.places      enable row level security;
alter table public.daily_cards enable row level security;
alter table public.source_log  enable row level security;

revoke all on public.places      from anon, authenticated;
revoke all on public.daily_cards from anon, authenticated;
revoke all on public.source_log  from anon, authenticated;

-- Supabase נותן ל-service_role הרשאות מלאות לבד. מבטלים, ונותנים רק מה שהמוצר צריך
revoke all on public.places      from service_role;
revoke all on public.daily_cards from service_role;
revoke all on public.source_log  from service_role;

grant select, update         on public.places      to service_role;
grant select, insert         on public.daily_cards to service_role;
grant select, insert, update on public.source_log  to service_role;

-- ---------- דיווחים (Milestone 5, נוסף ב-14.11.2026) ----------
-- עדכון מותנה אחד בבסיס הנתונים, כי שני דיווחים יכולים להגיע באותו רגע.

-- מוסיפה דיווח רק אם יש למקום פחות מ-p_max דיווחים פתוחים. מחזירה true אם נוסף.
create or replace function public.add_report(p_place_id uuid, p_report jsonb, p_max int)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int;
begin
  update public.places p
     set reports = p.reports || jsonb_build_array(p_report)
   where p.id = p_place_id
     and (select count(*)
            from jsonb_array_elements(p.reports) as r(item)
           where r.item->>'status' = 'open') < p_max;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- מסמנת דיווח "טופל" או "נדחה". מחזירה true אם הדיווח נמצא.
create or replace function public.set_report_status(p_place_id uuid, p_report_id text, p_status text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int;
begin
  if p_status is null or p_status not in ('handled', 'rejected') then
    return false;
  end if;

  update public.places p
     set reports = (
       select jsonb_agg(
                case when r.item->>'id' = p_report_id
                     then r.item || jsonb_build_object('status', p_status, 'status_at', now())
                     else r.item
                end
                order by r.ord)
         from jsonb_array_elements(p.reports) with ordinality as r(item, ord)
     )
   where p.id = p_place_id
     and exists (select 1
                   from jsonb_array_elements(p.reports) as r(item)
                  where r.item->>'id' = p_report_id);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke execute on function public.add_report(uuid, jsonb, int)         from public, anon, authenticated;
revoke execute on function public.set_report_status(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.add_report(uuid, jsonb, int)         to service_role;
grant  execute on function public.set_report_status(uuid, text, text) to service_role;
