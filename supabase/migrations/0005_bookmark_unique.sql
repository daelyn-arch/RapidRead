-- v0.5.9 — last-line-of-defense against the bookmark sync loop.
--
-- The 0a9c0e2-vintage initialLibrarySync bug minted fresh client UUIDs
-- when re-pulling cloud bookmarks, then pushed them back up — doubling
-- the cloud row count every sign-in. The code is fixed in v0.5.7, but
-- this constraint guarantees that even if the sync logic regresses, a
-- single (user, book, chapter, word) tuple can never have more than
-- one bookmark row. The duplicate insert just fails at the DB.
--
-- The pre-step dedupes any existing duplicates (none expected, but
-- safe to run repeatedly via `if not exists`).

with ranked as (
  select id,
         row_number() over (
           partition by user_id, book_id, chapter_index, word_index
           order by created_at asc, id asc
         ) as rn
    from public.bookmarks
)
delete from public.bookmarks b
 using ranked r
 where b.id = r.id
   and r.rn > 1;

alter table public.bookmarks
  drop constraint if exists bookmarks_user_book_position_unique;

alter table public.bookmarks
  add constraint bookmarks_user_book_position_unique
  unique (user_id, book_id, chapter_index, word_index);
