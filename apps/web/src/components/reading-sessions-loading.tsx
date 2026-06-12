import { Skeleton } from "./ui/skeleton";

export function ReadingSessionsLoading() {
  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="size-9" />
    </div>
  );
}
