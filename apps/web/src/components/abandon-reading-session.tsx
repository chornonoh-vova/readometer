import { useReadingSessionStore } from "@/store/reading-session";
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
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";

export function AbandonReadingSession() {
  const [open, setOpen] = useState(false);

  const cancel = useReadingSessionStore((state) => state.cancel);

  const onAbandonConfirm = () => {
    cancel();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button className="ml-auto" variant="destructive">
            <XIcon /> Abandon
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Abandon current session?</AlertDialogTitle>
          <AlertDialogDescription>
            This session will be removed permanently, and any progress that
            you've made will not be saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onAbandonConfirm}>
            Abandon
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
