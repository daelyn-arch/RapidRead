import ePub from 'epubjs';
import type { BookData, Chapter } from '@/types/book';

/**
 * Normalize an EPUB href for matching. Strips query/hash and any leading
 * path segments so `OEBPS/chapter-03.xhtml` matches `chapter-03.xhtml`.
 */
function normalizeHref(href: string): string {
  const noHash = href.split('#')[0].split('?')[0];
  return noHash.split('/').pop() ?? noHash;
}

interface NavItem {
  href: string;
  label: string;
  subitems?: NavItem[];
}

/** Flatten a nested ToC into a Map<normalizedHref, label>. */
function flattenToc(items: NavItem[] | undefined, map: Map<string, string>) {
  if (!items) return;
  for (const item of items) {
    if (item.href) {
      const key = normalizeHref(item.href);
      if (!map.has(key)) map.set(key, item.label.trim());
    }
    if (item.subitems?.length) flattenToc(item.subitems, map);
  }
}

/** First heading-style element in the document body, if any. */
function firstHeadingText(doc: Document): string | null {
  const h = doc.querySelector('h1, h2, h3');
  if (!h) return null;
  const text = h.textContent?.trim() ?? '';
  if (!text) return null;
  // Collapse whitespace, cap length so stray marquee text doesn't dominate
  return text.replace(/\s+/g, ' ').slice(0, 140);
}

export async function readEpubFile(file: File): Promise<BookData> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const chapters: Chapter[] = [];
  let globalWordIndex = 0;

  // Build a normalized, recursively flattened ToC lookup
  const toc = await book.loaded.navigation;
  const tocMap = new Map<string, string>();
  flattenToc(toc?.toc as NavItem[] | undefined, tocMap);

  // Extract text from each spine section
  const spine = book.spine as unknown as { each: (fn: (section: { load: (load: unknown) => Promise<unknown>; href: string; document?: Document }) => void) => void };

  const sections: { href: string; load: (load: unknown) => Promise<unknown> }[] = [];
  spine.each((section: { href: string; load: (load: unknown) => Promise<unknown> }) => {
    sections.push(section);
  });

  let fallbackSectionCounter = 0;

  for (const section of sections) {
    await section.load(book.load.bind(book));
    const doc = (section as unknown as { document: Document }).document;
    if (!doc?.body) continue;

    const rawText = doc.body.textContent?.trim() || '';
    if (rawText.length === 0) continue;

    const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount === 0) continue;

    // Title resolution order:
    // 1. ToC label for this section (normalized match) — best signal
    // 2. First H1/H2/H3 in the document — common in well-formed EPUBs
    // 3. Honest generic fallback ("Section N") — never lie by calling it "Chapter 1"
    const tocLabel = tocMap.get(normalizeHref(section.href));
    const headingLabel = tocLabel ? null : firstHeadingText(doc);
    const title = tocLabel
      ?? headingLabel
      ?? `Section ${++fallbackSectionCounter}`;

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
