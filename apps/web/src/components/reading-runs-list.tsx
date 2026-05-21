import type { ReadingRun } from "@/lib/reading-runs";
import { CalendarIcon } from "lucide-react";
import { BookStatus } from "./book-status";
import { BookProgress } from "./book-progress";
import { StartReadingSession } from "./start-reading-session";
import type { BookDetails } from "@/lib/books";
import { Suspense } from "react";
import { ReadingSessionsList } from "./reading-sessions-list";
import { formatDate } from "@/lib/format";
import { ReadingSessionsLoading } from "./reading-sessions-loading";

export function ReadingRunsList({
  book,
  readingRuns,
}: {
  book: BookDetails;
  readingRuns: ReadingRun[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {readingRuns.map((readingRun, idx) => {
        const num = readingRuns.length - idx;
        return (
          <li
            key={readingRun.id}
            className="flex flex-col gap-2 md:rounded-md border-y md:border md:px-4 py-2"
          >
            <div className="flex gap-1.5 items-center justify-between">
              <h2 className="text-lg font-semibold">Reading #{num}</h2>

              {idx === 0 && (
                <StartReadingSession book={book} readingRun={readingRun} />
              )}
            </div>

            <div className="flex gap-1.5 items-center text-sm">
              <CalendarIcon className="size-4" />
              Started:{" "}
              <time dateTime={readingRun.startedAt}>
                {formatDate(readingRun.startedAt)}
              </time>
            </div>

            {readingRun.finishedAt && (
              <div className="flex gap-1.5 items-center text-sm">
                <CalendarIcon className="size-4" />
                Finished:{" "}
                <time dateTime={readingRun.finishedAt}>
                  {formatDate(readingRun.finishedAt)}
                </time>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <BookStatus
                completedPages={readingRun.completedPages}
                totalPages={book.totalPages}
              />
              <BookProgress
                title={`${book.title}, reading #${num}`}
                completedPages={readingRun.completedPages}
                totalPages={book.totalPages}
                className="flex-1"
              />
            </div>

            <Suspense fallback={<ReadingSessionsLoading />}>
              <ReadingSessionsList
                defaultOpen={
                  idx === 0 || readingRun.completedPages < book.totalPages
                }
                num={num}
                runId={readingRun.id}
                bookId={readingRun.bookId}
                totalPages={book.totalPages}
              />
            </Suspense>
          </li>
        );
      })}
    </ul>
  );
}
