import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useDeleteBookMutation } from "@/lib/books";

export function DeleteBookAlert({
  bookId,
  title,
  open,
  onOpenChange,
  onSuccess,
}: {
  bookId: string;
  title: string;
  open: boolean;
  onOpenChange: (newOpen: boolean) => void;
  onSuccess?: () => void;
}) {
  const mutation = useDeleteBookMutation();

  const handleDelete = () => {
    mutation.mutate(bookId, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete book "{title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this book, sessions, and stats related
            to it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
