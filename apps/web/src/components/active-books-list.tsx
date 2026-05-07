import type { Book } from "@/lib/books";
import { ActiveBooksEmpty } from "./active-books-empty";
import { BookItem } from "./book-item";

export function ActiveBooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return (
      <div className="p-2">
        <ActiveBooksEmpty />
      </div>
    );
  }

  return (
    <div className="p-2 w-full grid grid-cols-1 gap-4">
      <h2 className="text-md">Continue reading</h2>
      {books.map((book) => (
        <BookItem key={book.id} book={book} />
      ))}
    </div>
  );
}
