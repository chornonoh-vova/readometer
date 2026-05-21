import { Skeleton } from "./ui/skeleton";

export function BookItemSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border">
      <Skeleton className="w-20 h-24 flex-shrink-0 rounded-sm" />
      <div className="flex-1 flex flex-col justify-between h-24 py-0.5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

export function BooksListLoading() {
  return (
    <div className="p-2 w-full grid grid-cols-1 gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <BookItemSkeleton key={i} />
      ))}
    </div>
  );
}
