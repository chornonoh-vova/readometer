import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import { formatDate } from "@/lib/format";
import { Fragment } from "react";
import { ReadingSessionItem } from "./reading-session-item";

export function ReadingSessionsList({
  runId,
  bookId,
  totalPages,
}: {
  runId: string;
  bookId: string;
  totalPages: number;
}) {
  const { data: readingSessions } = useReadingSessionsSuspenseQuery(runId);

  const groupedSessions = Object.groupBy(
    readingSessions.map((readingSession, idx) => ({
      ...readingSession,
      num: readingSessions.length - idx,
    })),
    ({ startTime }) => formatDate(startTime),
  );

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(groupedSessions).map(([day, sessions]) => (
        <Fragment key={day}>
          <h4 className="text-sm">{day}</h4>
          <ul role="group" className="flex flex-col gap-1">
            {sessions?.map((readingSession) => (
              <ReadingSessionItem
                key={readingSession.id}
                length={readingSessions.length}
                readingSession={readingSession}
                bookId={bookId}
                totalPages={totalPages}
              />
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  );
}
