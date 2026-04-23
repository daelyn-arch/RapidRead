export interface BookMeta {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  format: 'txt' | 'epub';
  totalWords: number;
  chapterCount: number;
  importedAt: number;
  lastReadAt?: number;
}

export interface Chapter {
  index: number;
  title: string;
  rawText: string;
  wordCount: number;
  startWordIndex: number;
}

export interface BookData {
  meta: BookMeta;
  chapters: Chapter[];
}

export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  wordIndex: number;
  globalWordIndex: number;
  lastUpdated: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  wordIndex: number;
  label?: string;
  createdAt: number;
}
