import { StartReadingSession } from "./start-reading-session";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "./ui/item";
import { Button } from "./ui/button";
import { progressPercentage, type Book } from "@/lib/books";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { bookCover } from "@/lib/cover";

export function ActiveBookItem({ book }: { book: Book }) {
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
        <ItemDescription>
          {book.completedPages} / {book.totalPages} pages (
          {progressPercentage(book.completedPages, book.totalPages)}%)
        </ItemDescription>
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
        <Button
          size="icon"
          variant="secondary"
          nativeButton={false}
          render={<Link to="/books/$bookId" params={{ bookId: book.id }} />}
        >
          <ChevronRightIcon />
          <span className="sr-only">Go to {book.title}</span>
        </Button>
      </ItemActions>
    </Item>
  );
}
