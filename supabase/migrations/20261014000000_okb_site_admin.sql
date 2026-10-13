-- =============================================================================
-- OKB Admin — website / Command Center visitor analytics and media captions
--
-- Apply ONCE to the Supabase project used by the OKB Bridge backend (the one
-- in OKB_BRIDGE_SUPABASE_URL), e.g. paste it into the Supabase SQL Editor.
-- The Admin page (/admin → Setup) shows this same SQL with a copy button.
--
-- * Additive only: does not touch any okb_bridge_* or okb_command_* table.
-- * Written and read by the Command Center server with the service-role key.
--   RLS is enabled with no policies and the stats function is not granted to
--   anon/authenticated, so the public keys can neither read nor write.
-- * No IP addresses are stored. A visitor is an anonymous random id kept in a
--   first-party cookie; location is the city/country Vercel derives per request.
-- =============================================================================

create table if not exists public.okb_site_visits (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  is_new_visitor boolean not null default false,
  area text not null check (area in ('website', 'command')),
  path text not null check (char_length(path) between 1 and 512),
  page_title text check (char_length(page_title) <= 300),
  referrer text check (char_length(referrer) <= 1024),
  referrer_host text check (char_length(referrer_host) <= 255),
  country text check (char_length(country) <= 8),
  region text check (char_length(region) <= 120),
  city text check (char_length(city) <= 120),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  browser text check (char_length(browser) <= 60),
  os text check (char_length(os) <= 60),
  screen text check (char_length(screen) <= 20),
  language text check (char_length(language) <= 35)
);

create index if not exists okb_site_visits_occurred_idx on public.okb_site_visits (occurred_at desc);
create index if not exists okb_site_visits_visitor_idx on public.okb_site_visits (visitor_id, occurred_at desc);

alter table public.okb_site_visits enable row level security;

-- Title and caption the admin gives a photo or video (keyed by its R2 object key).
create table if not exists public.okb_site_media (
  key text primary key check (char_length(key) between 1 and 1024),
  title text check (char_length(title) <= 200),
  caption text check (char_length(caption) <= 2000),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.okb_site_media enable row level security;

-- Details the admin can add when uploading or editing a file: the date it was taken, the place, and
-- (Command Center files) the coordinates that put it on the Operations map. Safe to run again.
alter table public.okb_site_media add column if not exists taken_at timestamptz;
alter table public.okb_site_media add column if not exists place text check (char_length(place) <= 200);
alter table public.okb_site_media add column if not exists latitude double precision check (latitude between -90 and 90);
alter table public.okb_site_media add column if not exists longitude double precision check (longitude between -180 and 180);

-- -----------------------------------------------------------------------------
-- Aggregates for the Admin dashboard over [p_from, p_to). Buckets and the
-- hour-of-day histogram are in Philippine time (Asia/Manila).
-- -----------------------------------------------------------------------------
create or replace function public.okb_site_visit_stats(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text default 'day',
  p_area text default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with v as (
    select *
    from okb_site_visits
    where occurred_at >= p_from
      and occurred_at < p_to
      and (p_area is null or area = p_area)
  )
  select jsonb_build_object(
    'pageViews', (select count(*) from v),
    'visitors', (select count(distinct visitor_id) from v),
    'sessions', (select count(distinct session_id) from v),
    'newVisitors', (select count(distinct visitor_id) from v where is_new_visitor),
    'liveVisitors', (
      select count(distinct visitor_id) from okb_site_visits
      where occurred_at > now() - interval '5 minutes'
        and (p_area is null or area = p_area)
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('t', b, 'views', views, 'visitors', visitors) order by b)
      from (
        select date_trunc(case when p_bucket = 'hour' then 'hour' else 'day' end,
                          occurred_at at time zone 'Asia/Manila') as b,
               count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1
      ) s
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('hour', h, 'views', views) order by h)
      from (
        select extract(hour from occurred_at at time zone 'Asia/Manila')::int as h, count(*) as views
        from v group by 1
      ) s
    ), '[]'::jsonb),
    'areas', coalesce((
      select jsonb_agg(jsonb_build_object('label', area, 'views', views, 'visitors', visitors) order by views desc)
      from (select area, count(*) as views, count(distinct visitor_id) as visitors from v group by 1) s
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('label', path, 'views', views, 'visitors', visitors) order by views desc)
      from (
        select path, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1 order by 2 desc limit 10
      ) s
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('label', c, 'views', views, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(country, '') as c, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1 order by 3 desc limit 10
      ) s
    ), '[]'::jsonb),
    'cities', coalesce((
      select jsonb_agg(jsonb_build_object('label', c, 'views', views, 'visitors', visitors) order by visitors desc)
      from (
        select concat_ws(', ', nullif(city, ''), nullif(region, ''), nullif(country, '')) as c,
               count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1 order by 3 desc limit 10
      ) s
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', d, 'views', views, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(device, '') as d, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1
      ) s
    ), '[]'::jsonb),
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('label', b, 'views', views, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(browser, '') as b, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1 order by 3 desc limit 8
      ) s
    ), '[]'::jsonb),
    'os', coalesce((
      select jsonb_agg(jsonb_build_object('label', o, 'views', views, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(os, '') as o, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1 order by 3 desc limit 8
      ) s
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(jsonb_build_object('label', r, 'views', views, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(referrer_host, '') as r, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1 order by 3 desc limit 10
      ) s
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.okb_site_visit_stats(timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.okb_site_visit_stats(timestamptz, timestamptz, text, text) to service_role;
