import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import { formatDate } from "@/lib/format";
import { Fragment } from "react";
import { ReadingSessionItem } from "./reading-session-item";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronsUpDownIcon } from "lucide-react";

export function ReadingSessionsList({
  defaultOpen,
  num,
  runId,
  bookId,
  totalPages,
}: {
  defaultOpen: boolean;
  num: number;
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

  if (Object.entries(groupedSessions).length === 0) {
    return null;
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
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
          {Object.entries(groupedSessions).map(([day, sessions]) => (
            <Fragment key={day}>
              <h4 className="text-sm">{day}</h4>
              <ul className="flex flex-col gap-1">
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
      </CollapsibleContent>
    </Collapsible>
  );
}
