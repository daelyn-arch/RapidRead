import type { BookMeta, ReadingProgress } from '@/types/book';
import BookCard from './BookCard';

interface Props {
  books: BookMeta[];
  progress: Record<string, ReadingProgress>;
  onBookClick: (bookId: string) => void;
  onBookDelete: (bookId: string) => void;
}

export default function BookList({ books, progress, onBookClick, onBookDelete }: Props) {
  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {books.map(book => (
        <BookCard
          key={book.id}
          book={book}
          progress={progress[book.id]}
          onClick={() => onBookClick(book.id)}
          onDelete={() => onBookDelete(book.id)}
        />
      ))}
    </div>
  );
}
