import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useIsPro } from '@/billing/useIsPro';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore, suppressNextSettingsBump } from '@/store/settingsStore';
import { syncQueue } from '@/lib/syncQueue';
import { loadBookContent } from '@/services/storageService';
import { fetchCloudSettings, pushCloudSettings } from './settingsSync';
import {
  initialLibrarySync,
  uploadBook,
  listCloudBooks,
  deleteCloudBook,
} from './bookSync';
import {
  fetchAllProgress,
  upsertProgress,
  clearBookIdCache,
} from './progressSync';
import {
  fetchAllBookmarks,
  upsertBookmark,
  deleteBookmark,
} from './bookmarksSync';

const SYNC_PREF_KEY = 'rapidread-sync-enabled';

export function isSyncPreferenceEnabled(): boolean {
  try {
    return window.localStorage.getItem(SYNC_PREF_KEY) !== 'false';
  } catch { return true; }
}

export function setSyncPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(SYNC_PREF_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}

/**
 * Mount once near the top of the app tree. It only activates for Pro users
 * who have sync enabled in preferences. Free users get a no-op.
 */
export function useCloudSync() {
  const { user } = useAuth();
  const isPro = useIsPro();
  const [enabled] = useSyncPreference();
  const active = !!user && isPro && enabled;

  const initializedFor = useRef<string | null>(null);
  const lastProgressSignature = useRef<string>('');
  const lastBookmarksSignature = useRef<string>('');
  const lastBooksSignature = useRef<string>('');

  useEffect(() => {
    if (!active || !user) return;
    if (initializedFor.current === user.id) return;
    initializedFor.current = user.id;
    clearBookIdCache();

    const store = useLibraryStore.getState();

    // Fire-and-forget initial merge.
    (async () => {
      try {
        await initialLibrarySync(user.id, store.books, store.addBook, store.updateBookMeta);

        // Merge cloud progress in (last-writer-wins).
        const cloudProgress = await fetchAllProgress(user.id);
        const freshStore = useLibraryStore.getState();
        Object.values(cloudProgress).forEach((p) => {
          const local = freshStore.progress[p.bookId];
          if (!local || p.lastUpdated > local.lastUpdated) {
            freshStore.updateProgress(p.bookId, {
              chapterIndex: p.chapterIndex,
              wordIndex: p.wordIndex,
              globalWordIndex: p.globalWordIndex,
            });
          }
        });

        // Merge cloud bookmarks (idempotent by client_id).
        const cloudBookmarks = await fetchAllBookmarks(user.id);
        const storeNow = useLibraryStore.getState();
        const localBmIds = new Set(storeNow.bookmarks.map((b) => b.id));
        cloudBookmarks.forEach((bm) => {
          if (!localBmIds.has(bm.id)) {
            storeNow.addBookmark({
              bookId: bm.bookId,
              chapterIndex: bm.chapterIndex,
              wordIndex: bm.wordIndex,
              label: bm.label,
            });
          }
        });

        // Settings — last-writer-wins, with one twist: if the local
        // _syncedForUser doesn't match this account, treat cloud as
        // authoritative regardless of local timestamp (so signing into a
        // different account on the same device doesn't push device A's
        // settings into account B).
        try {
          const cloudSettings = await fetchCloudSettings(user.id);
          const settingsState = useSettingsStore.getState();
          const localModifiedMs = settingsState._lastModifiedAt ?? 0;
          const sameUser = settingsState._syncedForUser === user.id;
          if (!cloudSettings) {
            // First time this account has cloud settings — push local up.
            const cloudUpdatedAt = await pushCloudSettings(user.id, settingsState.settings);
            useSettingsStore.setState({
              _lastModifiedAt: new Date(cloudUpdatedAt).getTime(),
              _syncedForUser: user.id,
            });
          } else {
            const cloudMs = new Date(cloudSettings.updated_at).getTime();
            const localWins = sameUser && localModifiedMs > cloudMs;
            if (localWins) {
              const cloudUpdatedAt = await pushCloudSettings(user.id, settingsState.settings);
              useSettingsStore.setState({
                _lastModifiedAt: new Date(cloudUpdatedAt).getTime(),
                _syncedForUser: user.id,
              });
            } else {
              suppressNextSettingsBump();
              useSettingsStore.setState({
                settings: cloudSettings.data,
                _lastModifiedAt: cloudMs,
                _syncedForUser: user.id,
              });
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[cloudSync] settings sync failed', e);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[cloudSync] initial sync failed', e);
      }
    })();

    return () => {
      initializedFor.current = null;
    };
  }, [active, user]);

  // Subscribe to store → push outbound mutations.
  useEffect(() => {
    if (!active || !user) return;

    const unsub = useLibraryStore.subscribe((state) => {
      // Progress: push any row whose signature changed.
      const progSig = JSON.stringify(
        Object.values(state.progress).map((p) => [p.bookId, p.lastUpdated]),
      );
      if (progSig !== lastProgressSignature.current) {
        lastProgressSignature.current = progSig;
        for (const p of Object.values(state.progress)) {
          syncQueue.enqueue(
            `progress:${p.bookId}`,
            () => upsertProgress(user.id, p),
            2000, // debounce 2s to avoid hammering DB per word
          );
        }
      }

      // Bookmarks
      const bmSig = JSON.stringify(state.bookmarks.map((b) => [b.id, b.createdAt]));
      if (bmSig !== lastBookmarksSignature.current) {
        lastBookmarksSignature.current = bmSig;
        for (const bm of state.bookmarks) {
          syncQueue.enqueue(`bookmark:${bm.id}`, () => upsertBookmark(user.id, bm));
        }
      }

      // Books added locally → upload parsed content.
      const bookSig = JSON.stringify(state.books.map((b) => [b.id, b.importedAt]));
      if (bookSig !== lastBooksSignature.current) {
        lastBooksSignature.current = bookSig;
        for (const b of state.books) {
          syncQueue.enqueue(`book:${b.id}`, async () => {
            // Only upload if not already uploaded.
            const existing = await listCloudBooks(user.id);
            if (existing.some((r) => r.client_id === b.id)) return;
            const chapters = await loadBookContent(b.id);
            if (!chapters) return;
            await uploadBook(user.id, b, chapters);
          });
        }
      }
    });

    // Prime the signatures from current state so the first mount doesn't trigger a full re-push.
    const initial = useLibraryStore.getState();
    lastProgressSignature.current = JSON.stringify(
      Object.values(initial.progress).map((p) => [p.bookId, p.lastUpdated]),
    );
    lastBookmarksSignature.current = JSON.stringify(
      initial.bookmarks.map((b) => [b.id, b.createdAt]),
    );
    lastBooksSignature.current = JSON.stringify(
      initial.books.map((b) => [b.id, b.importedAt]),
    );

    return () => { unsub(); };
  }, [active, user]);

  // Deletions: we watch a separate shallow diff of bookmark ids to detect removals.
  useEffect(() => {
    if (!active || !user) return;
    let prevIds = new Set(useLibraryStore.getState().bookmarks.map((b) => b.id));
    const unsub = useLibraryStore.subscribe((state) => {
      const curIds = new Set(state.bookmarks.map((b) => b.id));
      for (const id of prevIds) {
        if (!curIds.has(id)) {
          syncQueue.enqueue(`bookmark-del:${id}`, () => deleteBookmark(user.id, id));
        }
      }
      prevIds = curIds;
    });
    return () => unsub();
  }, [active, user]);

  // Book deletions: parallel to the bookmark watcher above. Removes the
  // cloud row + Storage blob; the books → reading_progress / bookmarks
  // foreign-key cascade cleans up the rest server-side.
  useEffect(() => {
    if (!active || !user) return;
    let prevIds = new Set(useLibraryStore.getState().books.map((b) => b.id));
    const unsub = useLibraryStore.subscribe((state) => {
      const curIds = new Set(state.books.map((b) => b.id));
      for (const id of prevIds) {
        if (!curIds.has(id)) {
          syncQueue.enqueue(`book-del:${id}`, () => deleteCloudBook(user.id, id));
        }
      }
      prevIds = curIds;
    });
    return () => unsub();
  }, [active, user]);

  // Settings outbound: hash the settings JSON, push to cloud whenever it
  // changes (debounced via the syncQueue). The hash watcher in
  // settingsStore.ts has already bumped `_lastModifiedAt`; we only react
  // to actual content diffs to avoid spurious pushes from no-op setState.
  useEffect(() => {
    if (!active || !user) return;
    let prevHash = JSON.stringify(useSettingsStore.getState().settings);
    const unsub = useSettingsStore.subscribe((state) => {
      const curHash = JSON.stringify(state.settings);
      if (curHash === prevHash) return;
      prevHash = curHash;
      syncQueue.enqueue(
        'settings',
        async () => {
          const updatedAt = await pushCloudSettings(user.id, state.settings);
          useSettingsStore.setState({
            _lastModifiedAt: new Date(updatedAt).getTime(),
            _syncedForUser: user.id,
          });
        },
        2500, // 2.5s debounce — coalesces rapid slider drags
      );
    });
    return () => unsub();
  }, [active, user]);
}

/**
 * Mount component (renders nothing). Kept out of AuthProvider so gate logic stays explicit.
 */
export function CloudSyncMount() {
  useCloudSync();
  return null;
}

const SYNC_PREF_EVENT = 'rapidread:sync-pref';

export function useSyncPreference(): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState<boolean>(() => isSyncPreferenceEnabled());
  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setVal(typeof detail === 'boolean' ? detail : isSyncPreferenceEnabled());
    };
    window.addEventListener(SYNC_PREF_EVENT, listener);
    return () => window.removeEventListener(SYNC_PREF_EVENT, listener);
  }, []);
  const setter = (v: boolean) => {
    setSyncPreference(v);
    window.dispatchEvent(new CustomEvent(SYNC_PREF_EVENT, { detail: v }));
  };
  return [val, setter];
}
