import type { Book } from "@/lib/books";
import { BooksEmpty } from "./books-empty";
import { BooksSearchEmpty } from "./books-search-empty";
import { BookItem } from "./book-item";

interface BooksListProps {
  books: Book[];
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function BooksList({
  books,
  hasFilters,
  onClearFilters,
}: BooksListProps) {
  if (books.length === 0) {
    if (hasFilters) {
      return <BooksSearchEmpty onClear={onClearFilters} />;
    }
    return <BooksEmpty />;
  }

  return (
    <div className="p-2 w-full grid grid-cols-1 gap-4">
      {books.map((book) => (
        <BookItem key={book.id} book={book} />
      ))}
    </div>
  );
}
