import type { ReadingRun } from "@/lib/reading-runs";
import { CalendarIcon, ChevronsUpDownIcon } from "lucide-react";
import { BookStatus } from "./book-status";
import { BookProgress } from "./book-progress";
import { Separator } from "./ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { StartReadingSession } from "./start-reading-session";
import type { BookDetails } from "@/lib/books";
import { Suspense } from "react";
import { ReadingSessionsList } from "./reading-sessions-list";
import { formatDate } from "@/lib/utils";
import { ReadingSessionsLoading } from "./reading-sessions-loading";

export function ReadingRunsList({
  book,
  readingRuns,
}: {
  book: BookDetails;
  readingRuns: ReadingRun[];
}) {
  return (
    <>
      {readingRuns.map((readingRun, idx) => (
        <section
          key={readingRun.id}
          className="flex flex-col gap-2 md:rounded-md border-y md:border md:px-4 py-2"
        >
          <div className="flex gap-1.5 items-center justify-between">
            <h2 className="text-lg font-semibold">
              Reading #{readingRuns.length - idx}
            </h2>

            <StartReadingSession book={book} readingRun={readingRun} />
          </div>

          <div className="flex gap-1.5 items-center text-sm">
            <CalendarIcon className="size-4" />
            Started: {formatDate(readingRun.startedAt)}
          </div>

          {readingRun.finishedAt && (
            <div className="flex gap-1.5 items-center text-sm">
              <CalendarIcon className="size-4" />
              Finished: {formatDate(readingRun.finishedAt)}
            </div>
          )}

          <div className="flex gap-2">
            <BookStatus
              completedPages={readingRun.completedPages}
              totalPages={book.totalPages}
            />
            <BookProgress
              completedPages={readingRun.completedPages}
              totalPages={book.totalPages}
            />
          </div>

          <Separator className="mt-2" />

          <Collapsible
            defaultOpen={
              idx === 0 || readingRun.completedPages < book.totalPages
            }
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <h3 className="text-sm font-semibold">Sessions</h3>
              <CollapsibleTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <ChevronsUpDownIcon />
                    <span className="sr-only">
                      Toggle sessions for run {idx + 1}
                    </span>
                  </Button>
                }
              />
            </div>
            <CollapsibleContent>
              <Suspense fallback={<ReadingSessionsLoading />}>
                <ReadingSessionsList
                  runId={readingRun.id}
                  bookId={readingRun.bookId}
                />
              </Suspense>
            </CollapsibleContent>
          </Collapsible>
        </section>
      ))}
    </>
  );
}
