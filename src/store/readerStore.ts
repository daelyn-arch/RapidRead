import { create } from 'zustand';
import type { WordToken } from '@/types/rsvp';
import {
  buildDialogueBlockIndex,
  computeAllKaraokeBlocks,
  computeDialogueBlocks,
  type DialogueBlock,
} from '@/engine/dialogueBlocks';

interface ReaderState {
  currentBookId: string | null;
  currentChapterIndex: number;
  tokens: WordToken[];
  currentTokenIndex: number;
  isPlaying: boolean;
  currentToken: WordToken | null;
  effectiveWpm: number;
  dialogueBlocks: DialogueBlock[];
  dialogueBlockIndex: Map<number, DialogueBlock>;
  /** Block index covering EVERY token (used by full-karaoke mode). */
  allKaraokeBlockIndex: Map<number, DialogueBlock>;
  /** Wall-clock ms of the most recent seek/skip. Tracker uses this to
   *  discard the next token-index change so word-click jumps don't get
   *  counted as words read. */
  lastSeekAt: number;
  setBook: (bookId: string) => void;
  setChapter: (chapterIndex: number) => void;
  setTokens: (tokens: WordToken[]) => void;
  setCurrentToken: (token: WordToken | null, index: number, effectiveWpm?: number) => void;
  setPlaying: (playing: boolean) => void;
  markSeek: () => void;
  reset: () => void;
}

export const useReaderStore = create<ReaderState>()((set) => ({
  currentBookId: null,
  currentChapterIndex: 0,
  tokens: [],
  currentTokenIndex: 0,
  isPlaying: false,
  currentToken: null,
  effectiveWpm: 0,
  dialogueBlocks: [],
  dialogueBlockIndex: new Map(),
  allKaraokeBlockIndex: new Map(),
  lastSeekAt: 0,

  setBook: (bookId: string) => set({ currentBookId: bookId }),
  setChapter: (chapterIndex: number) => set({ currentChapterIndex: chapterIndex }),
  setTokens: (tokens: WordToken[]) => {
    const dialogueBlocks = computeDialogueBlocks(tokens);
    const dialogueBlockIndex = buildDialogueBlockIndex(dialogueBlocks);
    const allKaraokeBlockIndex = buildDialogueBlockIndex(computeAllKaraokeBlocks(tokens));
    set({ tokens, dialogueBlocks, dialogueBlockIndex, allKaraokeBlockIndex });
  },
  setCurrentToken: (token: WordToken | null, index: number, effectiveWpm?: number) => set({
    currentToken: token,
    currentTokenIndex: index,
    effectiveWpm: effectiveWpm ?? 0,
  }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  markSeek: () => set({ lastSeekAt: Date.now() }),
  reset: () => set({
    currentBookId: null,
    currentChapterIndex: 0,
    tokens: [],
    currentTokenIndex: 0,
    isPlaying: false,
    currentToken: null,
    dialogueBlocks: [],
    dialogueBlockIndex: new Map(),
    allKaraokeBlockIndex: new Map(),
  }),
}));
