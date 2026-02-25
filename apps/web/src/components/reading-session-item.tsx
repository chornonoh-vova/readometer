import type { ReadingSession } from "@/lib/reading-sessions";
import { useState } from "react";
import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import {
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { formatReadingTime, formatTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { EditReadingSessionDialog } from "./edit-reading-session-dialog";
import { DeleteReadingSessionAlert } from "./delete-reading-session-alert";

export function ReadingSessionItem({
  length,
  readingSession,
  bookId,
  totalPages,
}: {
  length: number;
  readingSession: ReadingSession & { num: number };
  bookId: string;
  totalPages: number;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Item className="min-h-24" variant="outline" render={<li />}>
      <ItemContent>
        <ItemTitle>Session #{readingSession.num}</ItemTitle>
        <div className="flex gap-2 items-center">
          <CalendarIcon className="size-3.5" />
          {formatTime(readingSession.startTime)}
          {readingSession.endTime && " - " + formatTime(readingSession.endTime)}
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
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <PencilIcon /> Edit
              </DropdownMenuItem>
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

      <EditReadingSessionDialog
        latest={length === readingSession.num}
        session={readingSession}
        runId={readingSession.runId}
        bookId={bookId}
        totalPages={totalPages}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteReadingSessionAlert
        sessionId={readingSession.id}
        runId={readingSession.runId}
        bookId={bookId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Item>
  );
}
