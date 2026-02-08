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
import { useDeleteReadingSessionMutation } from "@/lib/reading-sessions";

export function DeleteReadingSessionAlert({
  sessionId,
  runId,
  bookId,
  open,
  onOpenChange,
  onSuccess,
}: {
  sessionId: string;
  runId: string;
  bookId: string;
  open: boolean;
  onOpenChange: (newOpen: boolean) => void;
  onSuccess?: () => void;
}) {
  const mutation = useDeleteReadingSessionMutation();

  const handleDelete = () => {
    mutation.mutate(
      { sessionId, runId, bookId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this session.
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
