import type { Book } from "@/lib/books";
import { BooksEmpty } from "./books-empty";
import { BookItem } from "./book-item";

export function BooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return <BooksEmpty />;
  }

  return (
    <div className="p-2 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {books.map((book) => (
        <BookItem key={book.id} book={book} />
      ))}
    </div>
  );
}
