import { AlertCircleIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "./ui/button";
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
import { Input } from "./ui/input";
import type { BookDetails } from "@/lib/books";
import { useActionState, useState } from "react";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { useAddReadingRunMutation, type ReadingRun } from "@/lib/reading-runs";
import { v7 as uuidv7 } from "uuid";
import { useReadingSessionStore } from "@/store/reading-session";
import { Alert, AlertTitle } from "./ui/alert";

export function StartReadingSession({
  book,
  readingRun,
}: {
  book: BookDetails;
  readingRun?: ReadingRun;
}) {
  const [open, setOpen] = useState(false);
  const start = useReadingSessionStore((state) => state.start);
  const addReadingRun = useAddReadingRunMutation();

  const defaultStartPage = readingRun?.completedPages ?? 0;

  const startReading = async (
    _prevState: string | null,
    formData: FormData,
  ) => {
    const startedAt = new Date().toISOString();
    const startPage = parseInt(formData.get("start-page")!.toString());

    let startReadingRun = readingRun;

    if (
      !startReadingRun ||
      startReadingRun.completedPages === book.totalPages
    ) {
      startReadingRun = await addReadingRun.mutateAsync({
        id: uuidv7(),
        bookId: book.id,
        completedPages: startPage,
        startedAt,
      });
    }

    setOpen(false);

    start(book, startReadingRun.id, startedAt, startPage);

    return null;
  };

  const [message, startReadingAction] = useActionState(startReading, null);

  let ButtonIcon = PlayIcon;
  let buttonLabel = "Start reading";

  if (readingRun) {
    if (readingRun.completedPages === book.totalPages) {
      ButtonIcon = RotateCcwIcon;
      buttonLabel = "Read again";
    } else {
      buttonLabel = "Continue reading";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <ButtonIcon />
            <span className="sr-only md:block md:not-sr-only">
              {buttonLabel}
            </span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start reading session</DialogTitle>
          <DialogDescription>Start a new reading session</DialogDescription>
        </DialogHeader>
        <form id="start-reading-form" action={startReadingAction}>
          <FieldGroup>
            {message && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{message}</AlertTitle>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="start-page">Start page</FieldLabel>
              <Input
                id="start-page"
                name="start-page"
                type="number"
                required
                defaultValue={defaultStartPage}
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={addReadingRun.isPending}
            form="start-reading-form"
            type="submit"
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
