import type { Book } from "@/lib/books";
import { ItemMedia } from "./ui/item";
import { BookImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookItemCover({
  book,
}: {
  book: Pick<Book, "title" | "coverId" | "coverColor">;
}) {
  const hasCover = !!book.coverId;
  const coverSrc = `/api/covers/${book.coverId}-sm.webp`;
  const coverAlt = `Cover image for book ${book.title}`;

  return (
    <ItemMedia
      className={cn(
        "aspect-2/3 w-20 rounded-sm overflow-hidden",
        !hasCover && "border border-primary border-dashed",
      )}
      style={{
        backgroundColor: book.coverColor,
      }}
    >
      {hasCover ? (
        <img
          className="object-contain h-full w-full"
          src={coverSrc}
          alt={coverAlt}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <BookImageIcon className="text-primary" />
          <span className="text-center text-xs text-muted-foreground">
            No cover
          </span>
        </div>
      )}
    </ItemMedia>
  );
}
