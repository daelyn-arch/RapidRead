import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookMeta, ReadingProgress, Bookmark } from '@/types/book';

interface LibraryState {
  books: BookMeta[];
  progress: Record<string, ReadingProgress>;
  bookmarks: Bookmark[];
  addBook: (meta: BookMeta) => void;
  updateBookMeta: (bookId: string, patch: Partial<BookMeta>) => void;
  removeBook: (id: string) => void;
  updateProgress: (bookId: string, update: Partial<ReadingProgress>) => void;
  getProgress: (bookId: string) => ReadingProgress | undefined;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  getBookmarks: (bookId: string) => Bookmark[];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      books: [],
      progress: {},
      bookmarks: [],

      addBook: (meta: BookMeta) => set(state => ({
        books: [...state.books, meta],
      })),

      updateBookMeta: (bookId: string, patch: Partial<BookMeta>) => set(state => ({
        books: state.books.map(b => (b.id === bookId ? { ...b, ...patch } : b)),
      })),

      removeBook: (id: string) => set(state => {
        const { [id]: _removed, ...rest } = state.progress;
        return {
          books: state.books.filter(b => b.id !== id),
          progress: rest,
          bookmarks: state.bookmarks.filter(b => b.bookId !== id),
        };
      }),

      updateProgress: (bookId: string, update: Partial<ReadingProgress>) => set(state => ({
        progress: {
          ...state.progress,
          [bookId]: {
            bookId,
            chapterIndex: 0,
            wordIndex: 0,
            globalWordIndex: 0,
            ...state.progress[bookId],
            ...update,
            lastUpdated: Date.now(),
          },
        },
        books: state.books.map(b =>
          b.id === bookId ? { ...b, lastReadAt: Date.now() } : b
        ),
      })),

      getProgress: (bookId: string) => get().progress[bookId],

      addBookmark: (bookmark) => set(state => ({
        bookmarks: [
          ...state.bookmarks,
          { ...bookmark, id: crypto.randomUUID(), createdAt: Date.now() },
        ],
      })),

      removeBookmark: (id: string) => set(state => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id),
      })),

      getBookmarks: (bookId: string) => get().bookmarks.filter(b => b.bookId === bookId),
    }),
    { name: 'rapidread-library' },
  ),
);
