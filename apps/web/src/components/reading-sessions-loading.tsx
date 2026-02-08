import { Skeleton } from "./ui/skeleton";

export function ReadingSessionsLoading() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 5 }, (_, i) => i).map((i) => (
        <Skeleton key={i} className="h-24 border rounded-lg" />
      ))}
    </div>
  );
}
