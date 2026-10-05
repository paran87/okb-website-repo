-- =============================================================================
-- OKB Command Center — operator-confirmed incidents linked to OKB Bridge reports
--
-- Apply ONCE to the Supabase project used by the OKB Bridge backend
-- (okb-bridge-cloud-backend), e.g. in the Supabase SQL Editor.
--
-- * Additive only: does not modify any okb_bridge_* table or row.
-- * The Command Center writes this table with the service-role key (server-side
--   only). RLS is enabled with no policies, so anon/authenticated keys cannot
--   read or write it — same model as the okb_bridge_* tables.
-- * Every incident keeps report_id, so it can always be traced back to the
--   original WhatsApp/Viber message (okb_bridge_reports.record->source).
-- =============================================================================

create sequence if not exists public.okb_command_incident_seq;

create table if not exists public.okb_command_incidents (
  id uuid primary key default gen_random_uuid(),
  -- Human reference, e.g. INC-20261005-000045 (Philippine date + sequence).
  incident_code text not null unique default (
    'INC-' || to_char(timezone('Asia/Manila', now()), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.okb_command_incident_seq')::text, 6, '0')
  ),
  report_id uuid not null references public.okb_bridge_reports(id) on delete restrict,
  -- Index into the report's extracted locations, when the incident is about one location.
  source_location_index integer check (source_location_index is null or source_location_index >= 0),
  title text not null check (char_length(title) between 3 and 200),
  incident_type text not null check (incident_type in (
    'flooding', 'road_obstruction', 'high_water_level', 'infrastructure_damage', 'drainage_clogging', 'other'
  )),
  -- Operator assessment (never AI-assigned).
  severity text not null check (severity in ('low', 'moderate', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'monitoring', 'resolved', 'closed')),
  location_text text,
  region text,
  province text,
  municipality text,
  description text,
  -- Operator who confirmed the incident (as signed in to the Command Center).
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists okb_command_incidents_report_idx on public.okb_command_incidents (report_id);
create index if not exists okb_command_incidents_created_idx on public.okb_command_incidents (created_at desc);

alter table public.okb_command_incidents enable row level security;

-- -----------------------------------------------------------------------------
-- Optional (recommended once report volume grows): expression indexes for the
-- Command Center's report filters. Additive; the bridge backend is unaffected.
-- -----------------------------------------------------------------------------
create index if not exists okb_bridge_reports_group_name_idx
  on public.okb_bridge_reports ((record->'source'->>'groupName'));
create index if not exists okb_bridge_reports_region_idx
  on public.okb_bridge_reports ((record->'extraction'->'administrative'->'region'->>'value'));
create index if not exists okb_bridge_reports_office_idx
  on public.okb_bridge_reports ((record->'extraction'->'administrative'->'districtEngineeringOffice'->>'value'));

-- For fast substring search over message text at large volumes, enable pg_trgm
-- and add a trigram index (uncomment after confirming the extension is allowed):
-- create extension if not exists pg_trgm;
-- create index if not exists okb_bridge_reports_message_trgm_idx
--   on public.okb_bridge_reports using gin ((record->'source'->>'messageText') gin_trgm_ops);
