import { Button } from "./ui/button";
import { AddBookForm } from "./add-book-form";
import { ResponsiveDrawerDialog } from "./responsive-drawer-dialog";

export function AddBookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const title = "Add a book";
  const description = "Fill in what you know — you can always edit it later";

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
        <Button type="submit" form="add-book-form" className="flex-1">
          Add book
        </Button>
      }
    >
      {open && (
        <AddBookForm
          className="md:-mx-4 overflow-y-auto md:max-h-[50vh] px-4 pb-2"
          onClose={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDrawerDialog>
  );
}
