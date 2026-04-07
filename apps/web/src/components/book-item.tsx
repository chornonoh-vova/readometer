import type { Book } from "@/lib/books";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Link } from "@tanstack/react-router";
import { BookStatus } from "./book-status";
import { BookProgress } from "./book-progress";
import { BookItemCover } from "./book-item-cover";

export function BookItem({ book }: { book: Book }) {
  return (
    <Item variant="outline" className="group" render={<Link to="/books/$bookId" params={{ bookId: book.id }} />}>
      <BookItemCover book={book} />

      <ItemContent className="gap-2 h-full">
        <div className="flex flex-col gap-1 items-start mb-auto">
          <ItemTitle className="group-hover:underline">
            {book.title}
          </ItemTitle>
          <ItemDescription>{book.author}</ItemDescription>
        </div>

        <BookStatus
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />

        <BookProgress
          title={book.title}
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />
      </ItemContent>
    </Item>
  );
}
