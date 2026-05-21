import { memo } from "react";
import { StartReadingSession } from "./start-reading-session";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "./ui/item";
import { buttonVariants } from "./ui/button";
import { type Book } from "@/lib/books";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { bookCover } from "@/lib/cover";
import { BookProgress } from "./book-progress";

export const ActiveBookItem = memo(function ActiveBookItem({
  book,
}: {
  book: Book;
}) {
  const cover = bookCover(book, "sm");
  return (
    <Item variant="outline" size="sm">
      {cover && (
        <ItemMedia
          variant="image"
          className="group-data-[size=sm]/item:size-14"
        >
          <img loading="lazy" src={cover.src} alt={cover.alt} />
        </ItemMedia>
      )}
      <ItemContent className="min-w-0">
        <ItemTitle className="block w-full truncate">{book.title}</ItemTitle>
        <BookProgress
          title={book.title}
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />
      </ItemContent>
      <ItemActions>
        <StartReadingSession
          icon
          book={book}
          readingRun={{
            id: book.lastRunId,
            completedPages: book.completedPages,
          }}
        />
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          className={buttonVariants({ variant: "secondary", size: "icon" })}
        >
          <ChevronRightIcon />
          <span className="sr-only">Go to {book.title}</span>
        </Link>
      </ItemActions>
    </Item>
  );
});
