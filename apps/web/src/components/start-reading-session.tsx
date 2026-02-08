import {
  AlertCircleIcon,
  LoaderCircleIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
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
import { useState } from "react";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { useAddReadingRunMutation, type ReadingRun } from "@/lib/reading-runs";
import { v7 as uuidv7 } from "uuid";
import { useReadingSessionStore } from "@/store/reading-session";
import { Alert, AlertTitle } from "./ui/alert";
import * as z from "zod";
import { useForm } from "@tanstack/react-form";

const startReadingSessionSchema = z.object({
  startPage: z.number().positive(),
});

export function StartReadingSession({
  book,
  readingRun,
}: {
  book: BookDetails;
  readingRun?: ReadingRun;
}) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const session = useReadingSessionStore((state) => state.session);
  const start = useReadingSessionStore((state) => state.start);
  const addReadingRun = useAddReadingRunMutation();

  const defaultValues: z.input<typeof startReadingSessionSchema> = {
    startPage: readingRun?.completedPages ?? 0,
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: startReadingSessionSchema,
    },
    onSubmit: async ({ value }) => {
      const startedAt = new Date().toISOString();

      let startReadingRun = readingRun;

      if (
        !startReadingRun ||
        startReadingRun.completedPages === book.totalPages
      ) {
        try {
          startReadingRun = await addReadingRun.mutateAsync({
            id: uuidv7(),
            bookId: book.id,
            completedPages: value.startPage,
            startedAt,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.cause &&
            typeof error.cause === "object" &&
            "message" in error.cause &&
            typeof error.cause.message === "string"
          ) {
            setErrorMessage(error.cause.message);
          } else {
            setErrorMessage(
              error instanceof Error ? error.message : String(error),
            );
            console.error(error);
          }
          return;
        }
      }

      setOpen(false);

      start(book, startReadingRun.id, startedAt, value.startPage);
    },
  });

  let ButtonIcon = PlayIcon;
  let buttonLabel = "Start reading";

  if (readingRun) {
    if (readingRun.completedPages === book.totalPages) {
      ButtonIcon = RotateCcwIcon;
      buttonLabel = "Read again";
    } else if (readingRun.id === session?.runId) {
      ButtonIcon = LoaderCircleIcon;
      buttonLabel = "Reading...";
    } else {
      buttonLabel = "Continue reading";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={!!session}>
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
        <form
          id="start-reading-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{errorMessage}</AlertTitle>
              </Alert>
            )}

            <form.Field
              name="startPage"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Start page</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.valueAsNumber)
                      }
                      type="number"
                      aria-invalid={isInvalid}
                      required
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
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
