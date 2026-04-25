import ePub from 'epubjs';
import type { BookData, Chapter } from '@/types/book';

/**
 * Downscale + re-encode an EPUB cover blob as a JPEG data URL. EPUBs
 * regularly ship 3-5MB hi-res JPEG covers; library cards display them
 * at ~150px wide, so a 600px-max thumbnail is plenty.
 *
 * Returns null on any failure (canvas unsupported, image decode error,
 * etc.) so the caller can simply omit the cover.
 */
async function compressCoverToDataUrl(blobUrl: string): Promise<string | null> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = blobUrl;
  });
  if (!img) return null;

  const MAX_DIM = 600;
  const ratio = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  const out = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
  });
  if (!out) return null;
  // Belt-and-suspenders cap. A 600px JPEG at quality 0.82 is typically
  // 30-100 KB; if something explodes past 500 KB drop it.
  if (out.size > 500 * 1024) return null;

  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(out);
  });
}

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
    const blobUrl = await book.coverUrl();
    if (blobUrl) {
      // epubjs returns a blob: URL valid only for the current page
      // lifetime. Compress + downscale to a thumbnail JPEG and store
      // as a data URL so the cover (a) survives reloads, (b)
      // round-trips through cloud sync, (c) doesn't bloat the books
      // row. EPUBs commonly ship 3-5MB hi-res cover JPEGs; an earlier
      // version bypassed this and shipped the raw blob, which caused
      // 30+ MB cover bandwidth per sign-in for affected accounts.
      const dataUrl = await compressCoverToDataUrl(blobUrl);
      if (dataUrl) bookData.meta.coverUrl = dataUrl;
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    // No cover available
  }

  book.destroy();
  return bookData;
}
