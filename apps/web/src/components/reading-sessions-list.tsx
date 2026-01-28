import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "./ui/item";
import {
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import { formatDate, formatReadingTime } from "@/lib/utils";

export function ReadingSessionsList({ runId }: { runId: string }) {
  const { data: readingSessions } = useReadingSessionsSuspenseQuery(runId);

  return (
    <div className="flex flex-col gap-1">
      {readingSessions.map((readingSession) => (
        <Item key={readingSession.id} variant="outline">
          <ItemContent>
            <ItemTitle>
              <CalendarIcon className="size-4" />
              {formatDate(readingSession.startTime)}
            </ItemTitle>
            <ItemDescription className="inline-flex gap-1.5 items-center">
              <BookOpenIcon className="size-3.5" />
              <span>
                Pages {readingSession.startPage}-{readingSession.endPage} (
                {readingSession.readPages} pages)
              </span>
              <ClockIcon className="size-3.5" />
              <span>{formatReadingTime(readingSession.readTime)}</span>
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button size="icon" variant="destructive">
              <Trash2Icon />
              <span className="sr-only">Delete session</span>
            </Button>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}
