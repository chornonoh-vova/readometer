import { BookOpenCheckIcon } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import type { BookDetails } from "@/lib/books";
import { StartReadingDialog } from "./start-reading-dialog";

export function ReadingRunsEmpty({ book }: { book: BookDetails }) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenCheckIcon />
        </EmptyMedia>
        <EmptyTitle>No reading sessions yet</EmptyTitle>
        <EmptyDescription>
          You haven't started reading this book yet
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <StartReadingDialog book={book} />
      </EmptyContent>
    </Empty>
  );
}
