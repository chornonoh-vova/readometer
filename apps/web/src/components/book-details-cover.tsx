import { fetchApi } from "@/lib/api";
import type { BookDetails } from "@/lib/books";
import { cn } from "@/lib/utils";
import { BookImageIcon, PlusIcon } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { books } from "@/lib/query-keys";

export function BookDetailsCover({
  book,
}: {
  book: Pick<BookDetails, "id" | "title" | "coverId" | "coverColor">;
}) {
  const coverRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const hasCover = !!book.coverId;
  const coverSrc = `/api/covers/${book.coverId}-md.webp`;
  const coverAlt = `Cover image for book ${book.title}`;

  const handleUploadClick = () => {
    coverRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    const formData = new FormData();
    formData.append("cover", file);

    toast.promise(
      () =>
        fetchApi(`/books/${book.id}/cover`, {
          method: "POST",
          body: formData,
        }),
      {
        loading: "Uploading cover...",
        success: () => {
          queryClient.invalidateQueries({
            queryKey: books.list,
          });
          queryClient.invalidateQueries({
            queryKey: books.details(book.id),
          });
          return {
            message: "Cover succesfully uploaded!",
          };
        },
        error: "Error uploading book cover",
      },
    );

    coverRef.current!.value = "";
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center aspect-2/3 w-32 sm:w-40 rounded-sm overflow-hidden",
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
            {book.title}
          </span>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="link" onClick={handleUploadClick}>
            <PlusIcon /> Add cover
          </Button>
        </div>
      )}
    </div>
  );
}
