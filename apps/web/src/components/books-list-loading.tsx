import { Skeleton } from "./ui/skeleton";

export function BooksListLoading() {
  return (
    <div className="p-2 w-full grid grid-cols-1 gap-4">
      {Array.from({ length: 5 }, (_, i) => i).map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}
