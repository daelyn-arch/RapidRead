import type { BookData, Chapter } from '@/types/book';

const CHAPTER_PATTERN = /^(?:chapter\s+\w+|part\s+\w+|prologue|epilogue|^[A-Z][A-Z\s]{2,}$)/im;

export function parseTxt(text: string, filename: string): BookData {
  const lines = text.split(/\r?\n/);
  const chapters: Chapter[] = [];
  let currentTitle = 'Full Text';
  let currentLines: string[] = [];
  let globalWordIndex = 0;

  const flushChapter = () => {
    const rawText = currentLines.join('\n').trim();
    if (rawText.length === 0) return;
    const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
    chapters.push({
      index: chapters.length,
      title: currentTitle,
      rawText,
      wordCount,
      startWordIndex: globalWordIndex,
    });
    globalWordIndex += wordCount;
  };

  for (const line of lines) {
    if (CHAPTER_PATTERN.test(line.trim()) && currentLines.some(l => l.trim().length > 0)) {
      flushChapter();
      currentTitle = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flushChapter();

  // If no chapters detected, wrap everything as one
  if (chapters.length === 0) {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    chapters.push({
      index: 0,
      title: 'Full Text',
      rawText: text.trim(),
      wordCount,
      startWordIndex: 0,
    });
  }

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const title = filename.replace(/\.txt$/i, '');

  return {
    meta: {
      id: crypto.randomUUID(),
      title,
      author: 'Unknown',
      format: 'txt',
      totalWords,
      chapterCount: chapters.length,
      importedAt: Date.now(),
    },
    chapters,
  };
}

export function readTxtFile(file: File): Promise<BookData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseTxt(reader.result as string, file.name));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
