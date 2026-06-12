import { Skeleton } from "./ui/skeleton";

export function ReadingRunStatsLoading() {
  return (
    <>
      <Skeleton className="h-5 w-10" />
      <div className="grid grid-rows-2 grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 border rounded-md" />
        ))}
      </div>
    </>
  );
}
