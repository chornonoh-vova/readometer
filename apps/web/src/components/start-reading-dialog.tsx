import { PlayIcon } from "lucide-react";
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
import { useAddReadingRunMutation } from "@/lib/reading-runs";
import { v7 as uuidv7 } from "uuid";
import { useReadingSessionStore } from "@/store/reading-session";

export function StartReadingDialog({ book }: { book: BookDetails }) {
  const [open, setOpen] = useState(false);
  const startReadingSession = useReadingSessionStore((state) => state.start);
  const addReadingRun = useAddReadingRunMutation();

  let defaultStartPage = book.readingRuns[0]?.completedPages ?? 0;

  if (defaultStartPage === book.totalPages) {
    defaultStartPage = 0;
  }

  const startReading = async (
    _prevState: string | null,
    formData: FormData,
  ) => {
    const startedAt = new Date().toISOString();
    const startPage = parseInt(formData.get("start-page")!.toString());

    let readingRun = book.readingRuns[0];

    if (defaultStartPage === 0) {
      readingRun = await addReadingRun.mutateAsync({
        id: uuidv7(),
        bookId: book.id,
        completedPages: startPage,
        startedAt,
        updatedAt: startedAt,
      });
    }

    startReadingSession(readingRun.id, startedAt, startPage);

    setOpen(false);

    return null;
  };

  const [message, startReadingAction] = useActionState(startReading, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlayIcon />
            Start reading
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
