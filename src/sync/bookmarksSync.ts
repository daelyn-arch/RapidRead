import type { Bookmark } from '@/types/book';
import { supabase } from '@/lib/supabaseClient';

export async function fetchAllBookmarks(userId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id,client_id,chapter_index,word_index,label,created_at,books!inner(client_id)')
    .eq('user_id', userId);
  if (error) throw new Error(`fetchAllBookmarks: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.client_id,
    bookId: row.books?.client_id,
    chapterIndex: row.chapter_index,
    wordIndex: row.word_index,
    label: row.label ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  })).filter((b: Bookmark) => !!b.bookId);
}

export async function upsertBookmark(userId: string, bookmark: Bookmark) {
  const { data: book } = await supabase
    .from('books')
    .select('id')
    .eq('user_id', userId)
    .eq('client_id', bookmark.bookId)
    .maybeSingle();
  if (!book) return;

  const { error } = await supabase
    .from('bookmarks')
    .upsert({
      user_id: userId,
      book_id: book.id,
      client_id: bookmark.id,
      chapter_index: bookmark.chapterIndex,
      word_index: bookmark.wordIndex,
      label: bookmark.label ?? null,
      created_at: new Date(bookmark.createdAt).toISOString(),
    }, { onConflict: 'user_id,client_id' });
  if (error) throw new Error(`upsertBookmark: ${error.message}`);
}

export async function deleteBookmark(userId: string, bookmarkClientId: string) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('client_id', bookmarkClientId);
  if (error) throw new Error(`deleteBookmark: ${error.message}`);
}
