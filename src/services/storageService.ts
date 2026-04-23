import type { BookData, Chapter } from '@/types/book';

const DB_NAME = 'rapidread';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBookContent(bookId: string, chapters: Chapter[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    tx.objectStore(BOOKS_STORE).put({ id: bookId, chapters });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBookContent(bookId: string): Promise<Chapter[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOKS_STORE, 'readonly');
    const request = tx.objectStore(BOOKS_STORE).get(bookId);
    request.onsuccess = () => {
      const result = request.result as { id: string; chapters: Chapter[] } | undefined;
      resolve(result?.chapters ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBookContent(bookId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    tx.objectStore(BOOKS_STORE).delete(bookId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function importBook(bookData: BookData): Promise<void> {
  await saveBookContent(bookData.meta.id, bookData.chapters);
}
