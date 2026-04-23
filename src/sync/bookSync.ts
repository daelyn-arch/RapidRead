import type { BookMeta, Chapter } from '@/types/book';
import { supabase } from '@/lib/supabaseClient';
import { loadBookContent, saveBookContent } from '@/services/storageService';

interface CloudBookRow {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  author: string;
  format: 'txt' | 'epub';
  total_words: number;
  chapter_count: number;
  storage_path: string | null;
  parsed_path: string | null;
  imported_at: string;
  last_read_at: string | null;
}

function parsedPathFor(userId: string, clientId: string) {
  return `${userId}/${clientId}/parsed.json`;
}

export async function listCloudBooks(userId: string): Promise<CloudBookRow[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(`listCloudBooks: ${error.message}`);
  return (data ?? []) as CloudBookRow[];
}

/**
 * Upload parsed chapters JSON to Storage and upsert the books row.
 * Idempotent on (user_id, client_id).
 */
export async function uploadBook(
  userId: string,
  meta: BookMeta,
  chapters: Chapter[],
) {
  const path = parsedPathFor(userId, meta.id);
  const payload = new Blob([JSON.stringify({ chapters })], { type: 'application/json' });

  const { error: storageError } = await supabase.storage
    .from('books')
    .upload(path, payload, { upsert: true, contentType: 'application/json' });
  if (storageError) throw new Error(`uploadBook storage: ${storageError.message}`);

  const { error: rowError } = await supabase
    .from('books')
    .upsert({
      user_id: userId,
      client_id: meta.id,
      title: meta.title,
      author: meta.author ?? '',
      format: meta.format,
      total_words: meta.totalWords,
      chapter_count: meta.chapterCount,
      parsed_path: path,
      imported_at: new Date(meta.importedAt).toISOString(),
      last_read_at: meta.lastReadAt ? new Date(meta.lastReadAt).toISOString() : null,
    }, { onConflict: 'user_id,client_id' });
  if (rowError) throw new Error(`uploadBook row: ${rowError.message}`);
}

/**
 * Download + hydrate chapters for a book we know the cloud row for.
 * Writes into the local IndexedDB so the reader can pick it up immediately.
 */
export async function downloadBookContent(row: CloudBookRow) {
  if (!row.parsed_path) return null;
  const { data, error } = await supabase.storage
    .from('books')
    .download(row.parsed_path);
  if (error) throw new Error(`downloadBookContent: ${error.message}`);
  const text = await data.text();
  const parsed = JSON.parse(text) as { chapters: Chapter[] };
  await saveBookContent(row.client_id, parsed.chapters);
  return parsed.chapters;
}

export async function deleteCloudBook(userId: string, clientId: string) {
  const path = parsedPathFor(userId, clientId);
  await supabase.storage.from('books').remove([path]);
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('user_id', userId)
    .eq('client_id', clientId);
  if (error) throw new Error(`deleteCloudBook: ${error.message}`);
}

export function cloudRowToMeta(row: CloudBookRow): BookMeta {
  return {
    id: row.client_id,
    title: row.title,
    author: row.author,
    format: row.format,
    totalWords: row.total_words,
    chapterCount: row.chapter_count,
    importedAt: new Date(row.imported_at).getTime(),
    lastReadAt: row.last_read_at ? new Date(row.last_read_at).getTime() : undefined,
  };
}

/**
 * One-shot library merge on login. Last-writer-wins by imported_at / lastReadAt.
 * - Local books missing in cloud → upload.
 * - Cloud books missing locally → add to local library (content downloaded on demand).
 */
export async function initialLibrarySync(
  userId: string,
  localBooks: BookMeta[],
  addLocalBook: (meta: BookMeta) => void,
) {
  const cloudRows = await listCloudBooks(userId);
  const cloudByClientId = new Map(cloudRows.map((r) => [r.client_id, r]));
  const localByClientId = new Map(localBooks.map((b) => [b.id, b]));

  // Push local-only books to cloud (parsed content + row).
  for (const local of localBooks) {
    if (cloudByClientId.has(local.id)) continue;
    const chapters = await loadBookContent(local.id);
    if (!chapters) continue;
    try {
      await uploadBook(userId, local, chapters);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[sync] upload failed during initial sync for', local.id, e);
    }
  }

  // Pull cloud-only books into local library metadata.
  for (const row of cloudRows) {
    if (localByClientId.has(row.client_id)) continue;
    addLocalBook(cloudRowToMeta(row));
  }
}
