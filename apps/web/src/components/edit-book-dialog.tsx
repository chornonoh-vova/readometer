import { Button } from "./ui/button";
import { type Book } from "@/lib/books";
import { ResponsiveDrawerDialog } from "./responsive-drawer-dialog";
import { EditBookForm } from "./edit-book-form";

export function EditBookDialog({
  book,
  open,
  onOpenChange,
}: {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const title = "Edit book";
  const description = "Update the details for this book";

  return (
    <ResponsiveDrawerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      close={
        <Button type="button" variant="secondary" className="flex-1">
          Cancel
        </Button>
      }
      action={
        <Button type="submit" form="edit-book-form" className="flex-1">
          Save changes
        </Button>
      }
    >
      {open && (
        <EditBookForm
          book={book}
          className="md:-mx-4 overflow-y-auto md:max-h-[50vh] px-4 pb-2"
          onClose={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDrawerDialog>
  );
}
