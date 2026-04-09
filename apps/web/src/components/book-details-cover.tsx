import type { BookDetails } from "@/lib/books";
import { cn } from "@/lib/utils";
import {
  BookImageIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  bookCover,
  uploadBookCover,
  useUploadBookCoverSuccess,
} from "@/lib/cover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DeleteBookCoverAlert } from "./delete-book-cover-alert";

export function BookDetailsCover({
  book,
}: {
  book: Pick<BookDetails, "id" | "title" | "coverId" | "coverColor">;
}) {
  const [deleteBookCoverOpen, setDeleteBookCoverOpen] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const onUploadBookCoverSuccess = useUploadBookCoverSuccess(book.id);
  const cover = bookCover(book, "md");

  const handleUploadClick = () => {
    coverRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];

    toast.promise(() => uploadBookCover(book.id, file), {
      loading: "Uploading cover...",
      success: () => {
        onUploadBookCoverSuccess();
        return {
          message: "Cover succesfully uploaded!",
        };
      },
      error: "Error uploading book cover",
    });

    event.target.value = "";
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center aspect-2/3 w-32 sm:w-40 rounded-sm overflow-hidden",
        !cover && "border border-primary border-dashed",
      )}
      style={{
        backgroundColor: book.coverColor,
      }}
    >
      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {cover ? (
        <>
          <img
            className="object-contain h-full w-full"
            src={cover.src}
            alt={cover.alt}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Open book cover menu for ${book.title}`}
                  className="absolute top-1 right-1"
                >
                  <MoreHorizontalIcon />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleUploadClick}>
                  <RefreshCcwIcon /> Replace
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteBookCoverOpen(true)}
                >
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DeleteBookCoverAlert
            bookId={book.id}
            open={deleteBookCoverOpen}
            onOpenChange={setDeleteBookCoverOpen}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <BookImageIcon className="text-primary" />
          <span className="text-center text-xs text-muted-foreground">
            {book.title}
          </span>
          <Button variant="link" onClick={handleUploadClick}>
            <PlusIcon /> Add cover
          </Button>
        </div>
      )}
    </div>
  );
}
