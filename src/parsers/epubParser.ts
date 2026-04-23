import ePub from 'epubjs';
import type { BookData, Chapter } from '@/types/book';

export async function readEpubFile(file: File): Promise<BookData> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const chapters: Chapter[] = [];
  let globalWordIndex = 0;

  // Get table of contents for chapter titles
  const toc = await book.loaded.navigation;
  const tocMap = new Map<string, string>();
  if (toc?.toc) {
    for (const item of toc.toc) {
      tocMap.set(item.href.split('#')[0], item.label.trim());
    }
  }

  // Extract text from each spine section
  const spine = book.spine as unknown as { each: (fn: (section: { load: (load: unknown) => Promise<unknown>; href: string; document?: Document }) => void) => void };

  const sections: { href: string; load: (load: unknown) => Promise<unknown> }[] = [];
  spine.each((section: { href: string; load: (load: unknown) => Promise<unknown> }) => {
    sections.push(section);
  });

  for (const section of sections) {
    await section.load(book.load.bind(book));
    const doc = (section as unknown as { document: Document }).document;
    if (!doc?.body) continue;

    const rawText = doc.body.textContent?.trim() || '';
    if (rawText.length === 0) continue;

    const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount === 0) continue;

    const title = tocMap.get(section.href) || `Chapter ${chapters.length + 1}`;

    chapters.push({
      index: chapters.length,
      title,
      rawText,
      wordCount,
      startWordIndex: globalWordIndex,
    });
    globalWordIndex += wordCount;
  }

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  // Try to get metadata
  const metadata = await book.loaded.metadata;

  const bookData: BookData = {
    meta: {
      id: crypto.randomUUID(),
      title: metadata?.title || file.name.replace(/\.epub$/i, ''),
      author: metadata?.creator || 'Unknown',
      format: 'epub',
      totalWords,
      chapterCount: chapters.length,
      importedAt: Date.now(),
    },
    chapters,
  };

  // Try to extract cover
  try {
    const coverUrl = await book.coverUrl();
    if (coverUrl) {
      bookData.meta.coverUrl = coverUrl;
    }
  } catch {
    // No cover available
  }

  book.destroy();
  return bookData;
}
