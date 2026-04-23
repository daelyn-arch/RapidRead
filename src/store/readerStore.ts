import { create } from 'zustand';
import type { WordToken } from '@/types/rsvp';

interface ReaderState {
  currentBookId: string | null;
  currentChapterIndex: number;
  tokens: WordToken[];
  currentTokenIndex: number;
  isPlaying: boolean;
  currentToken: WordToken | null;
  setBook: (bookId: string) => void;
  setChapter: (chapterIndex: number) => void;
  setTokens: (tokens: WordToken[]) => void;
  setCurrentToken: (token: WordToken | null, index: number) => void;
  setPlaying: (playing: boolean) => void;
  reset: () => void;
}

export const useReaderStore = create<ReaderState>()((set) => ({
  currentBookId: null,
  currentChapterIndex: 0,
  tokens: [],
  currentTokenIndex: 0,
  isPlaying: false,
  currentToken: null,

  setBook: (bookId: string) => set({ currentBookId: bookId }),
  setChapter: (chapterIndex: number) => set({ currentChapterIndex: chapterIndex }),
  setTokens: (tokens: WordToken[]) => set({ tokens }),
  setCurrentToken: (token: WordToken | null, index: number) => set({
    currentToken: token,
    currentTokenIndex: index,
  }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  reset: () => set({
    currentBookId: null,
    currentChapterIndex: 0,
    tokens: [],
    currentTokenIndex: 0,
    isPlaying: false,
    currentToken: null,
  }),
}));
