import type { ReadingRun } from "@/lib/reading-runs";
import {
  BookOpenIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  Trash2Icon,
} from "lucide-react";
import { BookStatus } from "./book-status";
import { BookProgress } from "./book-progress";
import { Separator } from "./ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "./ui/item";

export function ReadingRunsList({
  totalPages,
  readingRuns,
}: {
  totalPages: number;
  readingRuns: ReadingRun[];
}) {
  return (
    <>
      {readingRuns.map((readingRun, index) => (
        <section
          key={readingRun.id}
          className="flex flex-col gap-2 rounded-md border px-4 py-2"
        >
          <h2 className="text-lg font-semibold">Reading {index + 1}</h2>

          <div className="flex gap-1.5 items-center text-sm">
            <CalendarIcon className="size-4" />
            Started: {new Date(readingRun.startedAt).toLocaleDateString()}
          </div>

          {readingRun.finishedAt && (
            <div className="flex gap-1.5 items-center text-sm">
              <CalendarIcon className="size-4" />
              Finished: {new Date(readingRun.finishedAt).toLocaleDateString()}
            </div>
          )}

          <div className="flex gap-2">
            <BookStatus
              completedPages={readingRun.completedPages}
              totalPages={totalPages}
            />
            <BookProgress
              completedPages={readingRun.completedPages}
              totalPages={totalPages}
            />
          </div>

          <Separator className="mt-2" />

          <Collapsible
            defaultOpen={index === 0 || readingRun.completedPages < totalPages}
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <p className="text-sm font-semibold">Sessions</p>
              <CollapsibleTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <ChevronsUpDownIcon />
                    <span className="sr-only">
                      Toggle sessions for run {index + 1}
                    </span>
                  </Button>
                }
              />
            </div>
            <CollapsibleContent>
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>
                    <CalendarIcon className="size-4" />
                    10/15/2025
                  </ItemTitle>
                  <ItemDescription className="inline-flex gap-1.5 items-center">
                    <BookOpenIcon className="size-3.5" />
                    <span>Pages 1-20 (19 pages)</span>
                    <ClockIcon className="size-3.5" />
                    <span>23m</span>
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button size="icon" variant="destructive">
                    <Trash2Icon />
                    <span className="sr-only">Delete session</span>
                  </Button>
                </ItemActions>
              </Item>
            </CollapsibleContent>
          </Collapsible>
        </section>
      ))}
    </>
  );
}
