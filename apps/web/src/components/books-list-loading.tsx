import { Skeleton } from "./ui/skeleton";

/**
 * Mirrors `BookItem`'s default variant. The cover is `w-24 aspect-2/3` there,
 * so it is 96x144 here — the dimensions have to match or the list jumps when
 * the real content arrives.
 */
export function BookItemSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border">
      <Skeleton className="w-24 h-36 shrink-0 rounded-sm" />
      <div className="flex-1 flex flex-col justify-between h-36 py-0.5">
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

/** Mirrors `BookItem`'s compact variant: a `w-32` card, square cover, two title lines. */
export function CompactBookItemSkeleton() {
  return (
    <div className="w-32 shrink-0 flex flex-col gap-2.5 px-3 py-2.5 rounded-md border">
      <Skeleton className="w-full aspect-square rounded-sm" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function BooksListLoading() {
  return (
    <div className="p-2 w-full flex flex-col gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <BookItemSkeleton key={i} />
      ))}
    </div>
  );
}
