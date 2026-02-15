import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import {
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import { formatDate, formatReadingTime, formatTime } from "@/lib/utils";
import { DeleteReadingSessionAlert } from "./delete-reading-session-alert";
import { Fragment, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function ReadingSessionsList({
  runId,
  bookId,
}: {
  runId: string;
  bookId: string;
}) {
  const { data: readingSessions } = useReadingSessionsSuspenseQuery(runId);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
              <Item
                key={readingSession.id}
                className="min-h-24"
                variant="outline"
                render={<li />}
              >
                <ItemContent>
                  <ItemTitle>Session #{readingSession.num}</ItemTitle>
                  <div className="flex gap-2 items-center">
                    <CalendarIcon className="size-3.5" />
                    {formatTime(readingSession.startTime)}
                    {readingSession.endTime &&
                      " - " + formatTime(readingSession.endTime)}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <div className="flex gap-2 items-center">
                      <BookOpenIcon className="size-3.5" />
                      <span>
                        Pages {readingSession.startPage}-
                        {readingSession.endPage} ({readingSession.readPages}{" "}
                        pages)
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <ClockIcon className="size-3.5" />
                      {formatReadingTime(readingSession.readTime)}
                    </div>
                  </div>
                </ItemContent>
                <ItemActions>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="icon-sm">
                          <MoreHorizontalIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <Trash2Icon /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ItemActions>

                <DeleteReadingSessionAlert
                  sessionId={readingSession.id}
                  runId={runId}
                  bookId={bookId}
                  open={deleteOpen}
                  onOpenChange={setDeleteOpen}
                />
              </Item>
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  );
}
