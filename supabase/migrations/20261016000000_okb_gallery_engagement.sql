-- =============================================================================
-- OKB Gallery — visitor reactions and anonymous comments on photos and videos
--
-- Apply ONCE to the same Supabase project as the Admin tables (paste it into the
-- Supabase SQL Editor, or copy it from Admin → Setup). Safe to run again.
--
-- * Additive only. RLS is enabled with no policies: the public keys can neither
--   read nor write; the website server uses the service-role key.
-- * No names, e-mail addresses or IP addresses are stored. A visitor is a random
--   id kept in the browser, used only so one person has one reaction per item
--   and so comments can be rate-limited. Comments are always shown as Anonymous.
-- * item_key is the Gallery item's key (e.g. drive:<id>, youtube:<id>, or the
--   R2 object key of an uploaded file).
-- =============================================================================

create table if not exists public.okb_gallery_reactions (
  item_key text not null check (char_length(item_key) between 1 and 300),
  visitor_id uuid not null,
  reaction text not null check (reaction in ('like', 'love', 'clap', 'wow')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (item_key, visitor_id)
);

alter table public.okb_gallery_reactions enable row level security;

create table if not exists public.okb_gallery_comments (
  id bigint generated always as identity primary key,
  item_key text not null check (char_length(item_key) between 1 and 300),
  visitor_id uuid not null,
  body text not null check (char_length(body) between 1 and 500),
  -- Set to true to take a comment off the website without deleting it.
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists okb_gallery_comments_item_idx on public.okb_gallery_comments (item_key, created_at desc);
create index if not exists okb_gallery_comments_visitor_idx on public.okb_gallery_comments (visitor_id, created_at desc);

alter table public.okb_gallery_comments enable row level security;
