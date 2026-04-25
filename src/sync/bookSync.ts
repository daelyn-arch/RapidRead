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
  cover_url: string | null;
  imported_at: string;
  last_read_at: string | null;
}

function parsedPathFor(userId: string, clientId: string) {
  return `${userId}/${clientId}/parsed.json`;
}

export async function listCloudBooks(userId: string): Promise<CloudBookRow[]> {
  // NOTE: avoid `select('*')` — `cover_url` holds large data: URLs
  // (sometimes multi-MB for cover-rich EPUBs). Pulling it on every
  // listCloudBooks call from the outbound watcher meant 30+ MB of
  // bandwidth per sign-in for users with big-cover books. List the
  // exact columns we need.
  const { data, error } = await supabase
    .from('books')
    .select('id,user_id,client_id,title,author,format,total_words,chapter_count,storage_path,parsed_path,cover_url,imported_at,last_read_at')
    .eq('user_id', userId);
  if (error) throw new Error(`listCloudBooks: ${error.message}`);
  return (data ?? []) as CloudBookRow[];
}

/**
 * Cheap existence check used by the outbound subscribe loop. Pulling
 * full rows (including `cover_url`) every time a book changes is what
 * gave us the 30+ MB bandwidth blowup; this returns just `client_id`.
 */
export async function listCloudBookClientIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('books')
    .select('client_id')
    .eq('user_id', userId);
  if (error) throw new Error(`listCloudBookClientIds: ${error.message}`);
  return new Set((data ?? []).map((r: { client_id: string }) => r.client_id));
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
      cover_url: meta.coverUrl ?? null,
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

/**
 * Look up the cloud row for a book by its client ID and pull the parsed
 * chapters into IndexedDB. Used by the reader when a book exists in the
 * library (synced metadata) but has no local content yet — typical when
 * the user signs in on a new device.
 */
export async function downloadBookContentByClientId(
  userId: string,
  clientId: string,
): Promise<Chapter[] | null> {
  const { data, error } = await supabase
    .from('books')
    .select('id,user_id,client_id,title,author,format,total_words,chapter_count,storage_path,parsed_path,cover_url,imported_at,last_read_at')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (error || !data) return null;
  return downloadBookContent(data as CloudBookRow);
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
    coverUrl: row.cover_url ?? undefined,
    importedAt: new Date(row.imported_at).getTime(),
    lastReadAt: row.last_read_at ? new Date(row.last_read_at).getTime() : undefined,
  };
}

/**
 * Patch a single field on the cloud row (e.g. backfill cover_url without
 * re-uploading the parsed.json blob).
 */
async function patchCloudBookField(
  userId: string,
  clientId: string,
  patch: Partial<Pick<CloudBookRow, 'cover_url'>>,
) {
  const { error } = await supabase
    .from('books')
    .update(patch)
    .eq('user_id', userId)
    .eq('client_id', clientId);
  if (error) throw new Error(`patchCloudBookField: ${error.message}`);
}

/**
 * One-shot library merge on login. Last-writer-wins by imported_at / lastReadAt.
 * - Local books missing in cloud → upload.
 * - Cloud books missing locally → add to local library (content downloaded on demand).
 * - Covers backfill in both directions for books present in both stores.
 */
export async function initialLibrarySync(
  userId: string,
  localBooks: BookMeta[],
  addLocalBook: (meta: BookMeta) => void,
  updateLocalBook?: (bookId: string, patch: Partial<BookMeta>) => void,
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

  // Cover backfill — covers were not synced before v0.5.4, so existing
  // libraries split into two states: cloud has none / local has none.
  // Reconcile both directions for any book present in both stores.
  for (const local of localBooks) {
    const row = cloudByClientId.get(local.id);
    if (!row) continue;
    if (local.coverUrl && !row.cover_url) {
      try {
        await patchCloudBookField(userId, local.id, { cover_url: local.coverUrl });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[sync] cover backfill (push) failed for', local.id, e);
      }
    } else if (!local.coverUrl && row.cover_url && updateLocalBook) {
      updateLocalBook(local.id, { coverUrl: row.cover_url });
    }
  }
}
