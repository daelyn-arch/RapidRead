-- RapidRead SaaS initial schema
-- Run in the Supabase SQL editor. Also create a PRIVATE storage bucket named `books`
-- (Storage tab → New bucket → Private), then run the storage.objects policies at the bottom.

-- =========================================================
-- 1. Profiles (one row per auth.users row, created via trigger)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  plan text not null default 'free' check (plan in ('free','pro')),
  plan_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 2. Books (metadata row; blob lives in Storage)
-- =========================================================
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  title text not null,
  author text not null default '',
  format text not null check (format in ('txt','epub')),
  total_words int not null default 0,
  chapter_count int not null default 0,
  storage_path text,
  parsed_path text,
  imported_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (user_id, client_id)
);
create index if not exists books_user_idx
  on public.books(user_id, last_read_at desc nulls last);

-- =========================================================
-- 3. Reading progress (one row per user per book)
-- =========================================================
create table if not exists public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_index int not null default 0,
  word_index int not null default 0,
  global_word_index int not null default 0,
  last_updated timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- =========================================================
-- 4. Bookmarks
-- =========================================================
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  client_id text not null,
  chapter_index int not null,
  word_index int not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists bookmarks_user_book_idx
  on public.bookmarks(user_id, book_id);

-- =========================================================
-- 5. RLS — deny by default, owner-only
-- =========================================================
alter table public.profiles         enable row level security;
alter table public.books            enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks        enable row level security;

drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles
  for select using (auth.uid() = id);
-- No INSERT policy on profiles (trigger handles it with security definer).
-- No client UPDATE policy — only the service role (Stripe webhook) modifies plan/status.

drop policy if exists "books self all" on public.books;
create policy "books self all" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress self all" on public.reading_progress;
create policy "progress self all" on public.reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bookmarks self all" on public.bookmarks;
create policy "bookmarks self all" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- 6. Storage policies (run AFTER creating private 'books' bucket)
-- =========================================================
-- Path convention:
--   {user_id}/{client_id}/parsed.json     -- parsed chapters (what readers need to render)
--   {user_id}/{client_id}/source.epub     -- original file (optional)
--   {user_id}/{client_id}/source.txt      -- original file (optional)

drop policy if exists "books bucket self read" on storage.objects;
create policy "books bucket self read" on storage.objects
  for select using (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "books bucket self write" on storage.objects;
create policy "books bucket self write" on storage.objects
  for insert with check (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "books bucket self update" on storage.objects;
create policy "books bucket self update" on storage.objects
  for update using (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "books bucket self delete" on storage.objects;
create policy "books bucket self delete" on storage.objects
  for delete using (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );
