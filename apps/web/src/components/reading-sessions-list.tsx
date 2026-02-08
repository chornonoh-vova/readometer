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
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import { formatDate, formatReadingTime } from "@/lib/utils";
import { DeleteReadingSessionAlert } from "./delete-reading-session-alert";
import { useState } from "react";
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
