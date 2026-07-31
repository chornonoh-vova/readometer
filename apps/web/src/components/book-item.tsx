import { memo } from "react";
import type { Book } from "@/lib/books";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "./ui/item";
import { Link } from "@tanstack/react-router";
import { BookStatus } from "./book-status";
import { BookProgress } from "./book-progress";
import { BookItemCover } from "./book-item-cover";

/**
 * A book as a whole-card link. `compact` is the cover-and-title-only card used
 * in horizontal shelves, where there is no room for author, status, or
 * progress; it fills its container's width, so the container sets the size.
 */
export const BookItem = memo(function BookItem({
  book,
  variant = "default",
}: {
  book: Book;
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Item
        size="sm"
        variant="outline"
        // `content-start` keeps the wrapped rows packed at the top: `h-full`
        // stretches every card to the tallest in the shelf, and without it the
        // rows share that extra height and covers drift out of alignment.
        className="group h-full content-start"
        render={<Link to="/books/$bookId" params={{ bookId: book.id }} />}
      >
        <ItemHeader>
          <BookItemCover book={book} square className="w-full" />
        </ItemHeader>

        <ItemContent>
          <ItemTitle className="line-clamp-2 w-full group-hover:underline">
            {book.title}
          </ItemTitle>
        </ItemContent>
      </Item>
    );
  }

  return (
    <Item
      size="sm"
      variant="outline"
      className="group"
      render={<Link to="/books/$bookId" params={{ bookId: book.id }} />}
    >
      <BookItemCover book={book} />

      <ItemContent className="gap-2 h-full">
        <div className="flex flex-col gap-1 items-start mb-auto">
          <ItemTitle className="group-hover:underline">{book.title}</ItemTitle>
          <ItemDescription>{book.author}</ItemDescription>
        </div>

        <BookStatus
          completedPages={book.completedPages}
          totalPages={book.totalPages}
          abandoned={book.abandoned}
        />

        <BookProgress
          title={book.title}
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />
      </ItemContent>
    </Item>
  );
});
