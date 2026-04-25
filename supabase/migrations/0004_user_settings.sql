-- v0.5.6 — full settings cross-device sync.
-- Stores the entire AppSettings blob per user in JSONB. Last-writer-wins
-- by updated_at vs. local _lastModifiedAt timestamp.

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings self all" on public.user_settings;
create policy "settings self all" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
