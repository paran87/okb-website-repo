-- =============================================================================
-- OKB Feedback — "Report a problem" from the website, the Command Center and
-- OKB Mobile, tracked by admins until fixed (Admin → Feedback)
--
-- Apply ONCE to the same Supabase project as the Admin tables (paste it into the
-- Supabase SQL Editor, or copy it from Admin → Setup). Safe to run again.
--
-- * Additive only. RLS is enabled with no policies: the public keys can neither
--   read nor write; the website server uses the service-role key.
-- * No IP addresses are stored. Contact details are only what the sender typed
--   (optional, for a reply). A screenshot, when attached, is in the operations
--   R2 bucket under site-feedback/ and only admins can open it.
-- =============================================================================

create table if not exists public.okb_site_feedback (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category text not null check (category in ('bug', 'wrong_info', 'map', 'slow', 'suggestion', 'other')),
  area text not null check (area in ('website', 'command', 'mobile')),
  page_url text not null check (char_length(page_url) between 1 and 1024),
  page_title text check (char_length(page_title) <= 300),
  message text not null check (char_length(message) between 5 and 2000),
  contact text check (char_length(contact) <= 120),
  screenshot_key text check (char_length(screenshot_key) <= 300),
  device text check (char_length(device) <= 120),
  user_agent text check (char_length(user_agent) <= 512),
  screen text check (char_length(screen) <= 20),
  status text not null default 'new' check (status in ('new', 'in_progress', 'fixed', 'wont_fix')),
  admin_note text check (char_length(admin_note) <= 2000),
  handled_by text check (char_length(handled_by) <= 100),
  resolved_at timestamptz
);

create index if not exists okb_site_feedback_created_idx on public.okb_site_feedback (created_at desc);
create index if not exists okb_site_feedback_status_idx on public.okb_site_feedback (status, created_at desc);

alter table public.okb_site_feedback enable row level security;
