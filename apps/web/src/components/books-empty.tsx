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
        <EmptyTitle>Your library is empty</EmptyTitle>
        <EmptyDescription>
          Add your first book to start tracking your reading.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <AddBook />
      </EmptyContent>
    </Empty>
  );
}
