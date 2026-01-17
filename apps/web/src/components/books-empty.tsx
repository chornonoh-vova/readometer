import { BookPlusIcon } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { AddBook } from "./add-book";

export function BooksEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookPlusIcon />
        </EmptyMedia>
        <EmptyTitle>No books yet</EmptyTitle>
        <EmptyDescription>
          You haven't added any books yet. Get started by adding your first
          book.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <AddBook />
      </EmptyContent>
    </Empty>
  );
}
