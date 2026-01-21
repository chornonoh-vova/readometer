import { BookOpenCheckIcon, PlayIcon } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { Button } from "./ui/button";

export function ReadingRunsEmpty() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenCheckIcon />
        </EmptyMedia>
        <EmptyTitle>No reading sessions yet</EmptyTitle>
        <EmptyDescription>
          You haven't started reading this book yet
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <PlayIcon />
          Start reading
        </Button>
      </EmptyContent>
    </Empty>
  );
}
