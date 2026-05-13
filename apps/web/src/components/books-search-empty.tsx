import { SearchXIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";

export function BooksSearchEmpty({ onClear }: { onClear?: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>No books found</EmptyTitle>
        <EmptyDescription>
          Try adjusting your search or filters
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}
