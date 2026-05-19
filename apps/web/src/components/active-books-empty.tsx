import { BookMarkedIcon, ChevronRightIcon } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { buttonVariants } from "./ui/button";
import { Link } from "@tanstack/react-router";

export function ActiveBooksEmpty() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookMarkedIcon />
        </EmptyMedia>
        <EmptyTitle>No active books</EmptyTitle>
        <EmptyDescription>
          You haven't started reading any books yet. You can add a new book or
          you can look at all of your books.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/books" className={buttonVariants({ variant: "outline" })}>
          View all books
          <ChevronRightIcon />
        </Link>
      </EmptyContent>
    </Empty>
  );
}
