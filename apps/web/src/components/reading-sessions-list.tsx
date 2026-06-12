import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import { formatDate } from "@/lib/format";
import { Fragment, useMemo } from "react";
import { ReadingSessionItem } from "./reading-session-item";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronsUpDownIcon } from "lucide-react";
import { ReadingTime } from "./reading-time";
import { sumBy } from "@/lib/utils";

export function ReadingSessionsList({
  num,
  runId,
  bookId,
  totalPages,
}: {
  num: number;
  runId: string;
  bookId: string;
  totalPages: number;
}) {
  const { data: readingSessions } = useReadingSessionsSuspenseQuery(runId);

  const groupedSessions = useMemo(() => {
    const grouped = Object.groupBy(
      readingSessions.map((readingSession, idx) => ({
        ...readingSession,
        num: readingSessions.length - idx,
      })),
      ({ startTime }) => formatDate(startTime),
    );
    return Object.entries(grouped).map(([day, sessions = []]) => ({
      day,
      sessions,
      dayReadTime: sumBy(sessions, (s) => s.readTime),
    }));
  }, [readingSessions]);

  if (groupedSessions.length === 0) {
    return null;
  }

  return (
    <Collapsible>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="text-sm font-semibold">Sessions</h3>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="icon">
              <ChevronsUpDownIcon />
              <span className="sr-only">Toggle sessions for run {num}</span>
            </Button>
          }
        />
      </div>
      <CollapsibleContent>
        <div className="flex flex-col gap-2">
          {groupedSessions.map(({ day, sessions, dayReadTime }) => (
            <Fragment key={day}>
              <h4 className="text-sm inline-flex justify-between">
                <span>{day}</span>
                <ReadingTime value={dayReadTime} />
              </h4>
              <ul className="flex flex-col gap-1">
                {sessions.map((readingSession) => (
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
      </CollapsibleContent>
    </Collapsible>
  );
}
