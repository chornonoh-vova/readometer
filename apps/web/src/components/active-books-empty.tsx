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
        <EmptyTitle>Nothing in progress</EmptyTitle>
        <EmptyDescription>
          Pick up a book from your library to start a reading session, or add a
          new one.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/books" className={buttonVariants({ variant: "outline" })}>
          Go to your library
          <ChevronRightIcon />
        </Link>
      </EmptyContent>
    </Empty>
  );
}
