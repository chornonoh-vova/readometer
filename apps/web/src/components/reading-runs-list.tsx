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

export function ReadingRunsList({
  book,
  readingRuns,
}: {
  book: BookDetails;
  readingRuns: ReadingRun[];
}) {
  return (
    <>
      {readingRuns.map((readingRun, index) => (
        <section
          key={readingRun.id}
          className="flex flex-col gap-2 md:rounded-md border-y md:border md:px-4 py-2"
        >
          <div className="flex gap-1.5 items-center justify-between">
            <h2 className="text-lg font-semibold">
              Reading {readingRuns.length - index}
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
              index === 0 || readingRun.completedPages < book.totalPages
            }
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <p className="text-sm font-semibold">Sessions</p>
              <CollapsibleTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <ChevronsUpDownIcon />
                    <span className="sr-only">
                      Toggle sessions for run {index + 1}
                    </span>
                  </Button>
                }
              />
            </div>
            <CollapsibleContent>
              <Suspense fallback={<div>Loading...</div>}>
                <ReadingSessionsList runId={readingRun.id} />
              </Suspense>
            </CollapsibleContent>
          </Collapsible>
        </section>
      ))}
    </>
  );
}
