import { useState } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { deleteBookContent } from '@/services/storageService';

/**
 * Lists imported books with an explicit Delete button that requires
 * confirmation, so it can't be tapped by accident from the library grid.
 */
export default function ManageLibrary() {
  const books = useLibraryStore(s => s.books);
  const removeBook = useLibraryStore(s => s.removeBook);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function handleDelete(bookId: string) {
    removeBook(bookId);
    await deleteBookContent(bookId);
    setConfirmingId(null);
  }

  return (
    <div>
      <h3
        className="text-lg font-semibold mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        Manage library
      </h3>
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {books.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No books imported yet.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
            {books.map(book => {
              const isConfirming = confirmingId === book.id;
              return (
                <li
                  key={book.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
                  style={{ borderColor: 'var(--bg-tertiary)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {book.title}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {book.author || 'Unknown author'} · {book.totalWords.toLocaleString()} words
                    </p>
                  </div>
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(book.id)}
                        className="rounded-md px-3 py-1 text-xs font-medium"
                        style={{ background: '#ef4444', color: 'white' }}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md px-3 py-1 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(book.id)}
                      className="rounded-md px-3 py-1 text-xs border"
                      style={{
                        borderColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
