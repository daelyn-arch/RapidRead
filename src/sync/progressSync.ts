import type { ReadingProgress } from '@/types/book';
import { supabase } from '@/lib/supabaseClient';

interface CloudProgressRow {
  user_id: string;
  book_id: string;
  chapter_index: number;
  word_index: number;
  global_word_index: number;
  last_updated: string;
}

/**
 * Look up the books row id from its client_id for this user.
 * We cache the mapping to avoid chatty lookups during rapid progress updates.
 */
const bookIdCache = new Map<string, string>();

async function resolveBookRowId(userId: string, clientId: string): Promise<string | null> {
  const cacheKey = `${userId}:${clientId}`;
  const hit = bookIdCache.get(cacheKey);
  if (hit) return hit;
  const { data, error } = await supabase
    .from('books')
    .select('id')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (error || !data) return null;
  bookIdCache.set(cacheKey, data.id);
  return data.id;
}

export function clearBookIdCache() {
  bookIdCache.clear();
}

export async function fetchAllProgress(userId: string): Promise<Record<string, ReadingProgress>> {
  const { data, error } = await supabase
    .from('reading_progress')
    .select('book_id,chapter_index,word_index,global_word_index,last_updated,books!inner(client_id)')
    .eq('user_id', userId);
  if (error) throw new Error(`fetchAllProgress: ${error.message}`);

  const out: Record<string, ReadingProgress> = {};
  for (const row of data ?? []) {
    const clientId = (row as any).books?.client_id as string | undefined;
    if (!clientId) continue;
    out[clientId] = {
      bookId: clientId,
      chapterIndex: (row as any).chapter_index,
      wordIndex: (row as any).word_index,
      globalWordIndex: (row as any).global_word_index,
      lastUpdated: new Date((row as any).last_updated).getTime(),
    };
  }
  return out;
}

export async function upsertProgress(userId: string, p: ReadingProgress) {
  const bookRowId = await resolveBookRowId(userId, p.bookId);
  if (!bookRowId) return; // book hasn't been uploaded yet; skip this round, will sync later

  const { error } = await supabase
    .from('reading_progress')
    .upsert({
      user_id: userId,
      book_id: bookRowId,
      chapter_index: p.chapterIndex,
      word_index: p.wordIndex,
      global_word_index: p.globalWordIndex,
      last_updated: new Date(p.lastUpdated).toISOString(),
    }, { onConflict: 'user_id,book_id' });
  if (error) throw new Error(`upsertProgress: ${error.message}`);
}

export type { CloudProgressRow };
