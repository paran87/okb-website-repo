-- =============================================================================
-- OKB Accomplishment archive — a daily record of the OKB SSOT accomplishment
-- figures, so the progress of every waterway and drainage line can be followed
-- over time (Accomplishment → Updates → Archive)
--
-- Apply ONCE to the same Supabase project as the Admin tables (paste it into the
-- Supabase SQL Editor, or copy it from Admin → Setup). Safe to run again.
--
-- * Additive only. RLS is enabled with no policies: the public keys can neither
--   read nor write; the website server uses the service-role key.
-- * Only the public accomplishment figures are kept (names, places, volumes,
--   progress, status, points and lengths). No submitter details.
-- * Filled once a day by the Vercel cron job /api/cron/accomplishment-archive
--   (vercel.json); an admin can also take a snapshot from Admin → Setup.
-- =============================================================================

-- One row per Manila day: totals per record type, and per region and type.
create table if not exists public.okb_accomplishment_snapshots (
  day date primary key,
  taken_at timestamptz not null default now(),
  -- The first snapshot: every record's starting figures, no changes recorded.
  baseline boolean not null default false,
  records integer not null default 0,
  totals jsonb not null default '{}'::jsonb,
  regions jsonb not null default '{}'::jsonb
);

alter table public.okb_accomplishment_snapshots enable row level security;

-- The last figures seen for each record (what the next snapshot is compared with).
create table if not exists public.okb_accomplishment_records (
  key text primary key check (char_length(key) between 1 and 600),
  kind text not null check (kind in ('waterway', 'drainage', 'isf')),
  region text not null default '',
  site text not null default '',
  name text not null check (char_length(name) between 1 and 400),
  state jsonb not null,
  first_seen date not null,
  last_changed date,
  -- No longer in the sheet (renamed or removed); comes back if it reappears.
  removed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.okb_accomplishment_records enable row level security;

-- What changed on each record, day by day.
create table if not exists public.okb_accomplishment_changes (
  id bigint generated always as identity primary key,
  day date not null,
  detected_at timestamptz not null default now(),
  key text not null check (char_length(key) between 1 and 600),
  kind text not null check (kind in ('waterway', 'drainage', 'isf')),
  region text not null default '',
  site text not null default '',
  name text not null check (char_length(name) between 1 and 400),
  change text not null check (change in ('update', 'added', 'removed')),
  before jsonb,
  after jsonb
);

create index if not exists okb_accomplishment_changes_day_idx on public.okb_accomplishment_changes (day desc, id desc);
create index if not exists okb_accomplishment_changes_key_idx on public.okb_accomplishment_changes (key, day desc);

alter table public.okb_accomplishment_changes enable row level security;
