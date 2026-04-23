import { useState, useCallback } from 'react';
import { readTxtFile } from '@/parsers/txtParser';
import { readEpubFile } from '@/parsers/epubParser';
import { importBook } from '@/services/storageService';
import { useLibraryStore } from '@/store/libraryStore';
import type { BookData } from '@/types/book';

export function useBookImport() {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addBook = useLibraryStore(s => s.addBook);

  const importFile = useCallback(async (file: File) => {
    setImporting(true);
    setError(null);

    try {
      let bookData: BookData;

      if (file.name.endsWith('.epub')) {
        bookData = await readEpubFile(file);
      } else if (file.name.endsWith('.txt')) {
        bookData = await readTxtFile(file);
      } else {
        throw new Error('Unsupported file format. Please use .epub or .txt files.');
      }

      await importBook(bookData);
      addBook(bookData.meta);

      return bookData.meta;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import book';
      setError(message);
      return null;
    } finally {
      setImporting(false);
    }
  }, [addBook]);

  return { importFile, importing, error, clearError: () => setError(null) };
}
