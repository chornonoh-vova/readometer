import type { Book } from "@/lib/books";
import { ActiveBooksEmpty } from "./active-books-empty";
import { ActiveBookItem } from "./active-book-item";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "./ui/button";
import { ChevronRightIcon } from "lucide-react";

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
        <ActiveBookItem key={book.id} book={book} />
      ))}
      <Link to="/books" className={buttonVariants({ variant: "secondary" })}>
        View all books
        <ChevronRightIcon />
      </Link>
    </div>
  );
}
