-- v0.7 — reading analytics: per-day rollup of words read + time spent.
--
-- One row per user per UTC day. Counters are upserted incrementally
-- by the client every ~30s during playback. Fast to query for graphs
-- (just SELECT day, words_read WHERE user_id = X ORDER BY day) and
-- aggregate stats (SUM by week/month/year/all-time).
--
-- Per-session granularity is intentionally NOT stored — the privacy
-- boundary is "what days did you read and how much", not "exactly when
-- did you sit down to read".

create table if not exists public.reading_stats_daily (
  user_id        uuid not null references auth.users(id) on delete cascade,
  day            date not null,
  words_read     int  not null default 0,
  total_seconds  int  not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists reading_stats_daily_user_idx
  on public.reading_stats_daily(user_id, day desc);

alter table public.reading_stats_daily enable row level security;

drop policy if exists "stats self all" on public.reading_stats_daily;
create policy "stats self all" on public.reading_stats_daily
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
