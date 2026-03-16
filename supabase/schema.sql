-- NeuralNotes Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================================
-- 1. Enable pgvector extension
-- ============================================================
create extension if not exists vector;

-- ============================================================
-- 2. Notes table
-- ============================================================
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,           -- Clerk user ID (e.g. "user_2abc...")
  title       text not null default 'Untitled',
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists notes_user_id_idx on notes(user_id);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();

-- ============================================================
-- 3. Embeddings table (cached Gemini embeddings per note)
-- ============================================================
create table if not exists embeddings (
  note_id     uuid primary key references notes(id) on delete cascade,
  vector      vector(768),             -- gemini-embedding-001 = 768 dimensions
  model       text not null default 'gemini-embedding-001',
  updated_at  timestamptz not null default now()
);

create trigger embeddings_updated_at
  before update on embeddings
  for each row execute function update_updated_at();

-- ============================================================
-- 4. Note links table (AI-discovered connections)
-- ============================================================
create table if not exists note_links (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references notes(id) on delete cascade,
  target_id     uuid not null references notes(id) on delete cascade,
  score         float not null check (score >= 0 and score <= 1),  -- cosine similarity
  explanation   text,                  -- AI-generated explanation (may be null until fetched)
  created_at    timestamptz not null default now(),
  unique(source_id, target_id)
);

create index if not exists note_links_source_idx on note_links(source_id);
create index if not exists note_links_target_idx on note_links(target_id);

-- ============================================================
-- 5. Row-Level Security (RLS)
--    Users can only see/modify their own notes and related data
-- ============================================================
alter table notes enable row level security;
alter table embeddings enable row level security;
alter table note_links enable row level security;

-- Notes: full access to own rows only
create policy "Users can manage their own notes"
  on notes for all
  using (user_id = current_setting('app.current_user_id', true));

-- Embeddings: accessible if the related note belongs to the user
create policy "Users can manage embeddings for their own notes"
  on embeddings for all
  using (
    note_id in (
      select id from notes
      where user_id = current_setting('app.current_user_id', true)
    )
  );

-- Note links: accessible if source note belongs to the user
create policy "Users can manage links for their own notes"
  on note_links for all
  using (
    source_id in (
      select id from notes
      where user_id = current_setting('app.current_user_id', true)
    )
  );
