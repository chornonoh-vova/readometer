import type { Book } from "@/lib/books";
import { ActiveBooksEmpty } from "./active-books-empty";
import { BookItem } from "./book-item";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "./ui/button";
import { ChevronRightIcon } from "lucide-react";
import { StartReadingSession } from "./start-reading-session";
import { SectionHeader } from "./section-header";

export function ActiveBooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return (
      <div className="p-2">
        <ActiveBooksEmpty />
      </div>
    );
  }

  const mostRecentBook = books[0]!;
  const otherBooks = books.slice(1);

  const viewAllBooks = (
    <Link to="/books" className={buttonVariants({ variant: "link" })}>
      View all books
      <ChevronRightIcon />
    </Link>
  );

  return (
    <section className="p-2 w-full flex flex-col gap-4">
      <SectionHeader title="Most recent book">
        <StartReadingSession
          book={mostRecentBook}
          readingRun={{
            id: mostRecentBook.lastRunId,
            completedPages: mostRecentBook.completedPages,
          }}
        />
      </SectionHeader>

      <BookItem book={mostRecentBook} />

      {otherBooks.length === 0 ? (
        <SectionHeader>{viewAllBooks}</SectionHeader>
      ) : (
        <>
          <SectionHeader title="Also reading">{viewAllBooks}</SectionHeader>

          <ul className="flex flex-row overflow-x-auto gap-2">
            {otherBooks.map((book) => (
              <li key={book.id} className="w-32 shrink-0">
                <BookItem variant="compact" book={book} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
