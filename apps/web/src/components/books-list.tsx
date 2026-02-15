import type { Book } from "@/lib/books";
import { BooksEmpty } from "./books-empty";
import { BookItem } from "./book-item";

export function BooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return <BooksEmpty />;
  }

  return (
    <ul className="p-2 w-full grid grid-cols-1 gap-4">
      {books.map((book) => (
        <BookItem key={book.id} book={book} />
      ))}
    </ul>
  );
}
