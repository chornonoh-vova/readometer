import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import {
  BookOpenIcon,
  CalendarCheckIcon,
  CalendarIcon,
  ClockIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import { formatDateTime, formatReadingTime } from "@/lib/utils";
import { DeleteReadingSessionAlert } from "./delete-reading-session-alert";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ReadingSessionsList({
  runId,
  bookId,
}: {
  runId: string;
  bookId: string;
}) {
  const { data: readingSessions } = useReadingSessionsSuspenseQuery(runId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {readingSessions.map((readingSession, idx) => (
        <Item key={readingSession.id} className="min-h-24" variant="outline">
          <ItemContent>
            <ItemTitle>Session #{readingSessions.length - idx}</ItemTitle>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <div className="flex gap-2 items-center">
                <Tooltip>
                  <TooltipTrigger
                    render={<CalendarIcon className="size-3.5" />}
                  />
                  <TooltipContent>Session start time</TooltipContent>
                </Tooltip>
                {formatDateTime(readingSession.startTime)}
              </div>
              {readingSession.endTime && (
                <div className="flex gap-2 items-center">
                  <Tooltip>
                    <TooltipTrigger
                      render={<CalendarCheckIcon className="size-3.5" />}
                    />
                    <TooltipContent>Session end time</TooltipContent>
                  </Tooltip>
                  {formatDateTime(readingSession.endTime)}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <div className="flex gap-2 items-center">
                <BookOpenIcon className="size-3.5" />
                <span>
                  Pages {readingSession.startPage}-{readingSession.endPage} (
                  {readingSession.readPages} pages)
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Tooltip>
                  <TooltipTrigger render={<ClockIcon className="size-3.5" />} />
                  <TooltipContent>Session reading time</TooltipContent>
                </Tooltip>
                <span>{formatReadingTime(readingSession.readTime)}</span>
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
    </div>
  );
}
