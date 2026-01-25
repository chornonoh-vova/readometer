import { useActionState, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircleIcon, FlagIcon } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { useReadingSessionStore } from "@/store/reading-session";
import { useAddReadingSessionMutation } from "@/lib/reading-sessions";
import { v7 as uuidv7 } from "uuid";
import { Alert, AlertTitle } from "./ui/alert";

export function FinishReadingSession() {
  const [open, setOpen] = useState(false);
  const session = useReadingSessionStore((state) => state.session);
  const pause = useReadingSessionStore((state) => state.pause);
  const finish = useReadingSessionStore((state) => state.finish);
  const addReadingSession = useAddReadingSessionMutation(session!.book.id);

  const finishReading = async (
    _prevState: string | null,
    formData: FormData,
  ) => {
    if (!session) return null;

    const endPage = parseInt(formData.get("end-page")!.toString());

    await addReadingSession.mutateAsync({
      id: uuidv7(),
      runId: session.runId,
      startPage: session.startPage,
      endPage,
      startTime: session.startedAt,
      endTime: session.lastPausedAt!,
      readTime: Math.floor(session.readTime),
    });

    setOpen(false);

    finish();

    return null;
  };

  const [message, finishReadingAction] = useActionState(finishReading, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" title="Finish" onClick={pause}>
            <FlagIcon />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish reading session</DialogTitle>
          <DialogDescription>Complete a reading session</DialogDescription>
        </DialogHeader>
        <form id="finish-reading-form" action={finishReadingAction}>
          <FieldGroup>
            {message && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{message}</AlertTitle>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="end-page">End page</FieldLabel>
              <Input id="end-page" name="end-page" type="number" required />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={addReadingSession.isPending}
            form="finish-reading-form"
            type="submit"
          >
            Finish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
