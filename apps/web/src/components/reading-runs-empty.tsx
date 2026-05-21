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
import { StartReadingSession } from "./start-reading-session";
import { AddHistoricReadingRun } from "./add-historic-reading-run";

export function ReadingRunsEmpty({ book }: { book: BookDetails }) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenCheckIcon />
        </EmptyMedia>
        <EmptyTitle>Ready to start reading?</EmptyTitle>
        <EmptyDescription>
          Start a session to track your progress, or log a read you've already
          finished.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <AddHistoricReadingRun bookId={book.id} totalPages={book.totalPages} />
        <StartReadingSession book={book} />
      </EmptyContent>
    </Empty>
  );
}
