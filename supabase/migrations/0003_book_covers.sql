-- v0.5.4 — store book cover thumbnails on the row so they survive a
-- page reload (blob URLs from epubjs die with the page) and round-trip
-- through cloud sync to other devices.
--
-- Cover values are small data: URLs (~30-200 KB base64) embedded in the
-- row. Postgres TEXT handles this fine and the books table stays under
-- a few MB total even for power users.

alter table public.books
  add column if not exists cover_url text;
