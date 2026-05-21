-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Create the bookmarks table
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text not null,
  title       text not null,
  favicon_url text,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.bookmarks enable row level security;

-- 3. RLS Policies — users can only access their own rows
-- SELECT: can only read own bookmarks
create policy "Users can view their own bookmarks"
  on public.bookmarks
  for select
  using (auth.uid() = user_id);

-- INSERT: can only insert with their own user_id
create policy "Users can insert their own bookmarks"
  on public.bookmarks
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: can only update own rows
create policy "Users can update their own bookmarks"
  on public.bookmarks
  for update
  using (auth.uid() = user_id);

-- DELETE: can only delete own rows
create policy "Users can delete their own bookmarks"
  on public.bookmarks
  for delete
  using (auth.uid() = user_id);

-- 4. Enable Realtime for this table
-- Go to: Supabase Dashboard → Database → Replication
-- Toggle on public.bookmarks under "Source"
-- OR run this:
alter publication supabase_realtime add table public.bookmarks;

-- 5. Performance index
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
create index if not exists bookmarks_created_at_idx on public.bookmarks(created_at desc);
