import type { Book } from "@/lib/books";
import { ItemMedia } from "./ui/item";
import { BookImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookCover } from "@/lib/cover";

export function BookItemCover({
  book,
}: {
  book: Pick<Book, "title" | "coverId" | "coverColor">;
}) {
  const cover = bookCover(book, "sm");

  return (
    <ItemMedia
      className={cn(
        "aspect-2/3 w-20 rounded-sm overflow-hidden",
        !cover && "border border-primary border-dashed",
      )}
      style={{
        backgroundColor: book.coverColor,
      }}
    >
      {cover ? (
        <img
          className="object-contain h-full w-full"
          src={cover.src}
          alt={cover.alt}
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
