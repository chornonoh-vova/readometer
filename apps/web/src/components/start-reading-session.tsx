import {
  AlertCircleIcon,
  LoaderIcon,
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
import { getErrorMessage } from "@/lib/error";
import { v7 as uuidv7 } from "uuid";
import { useReadingSessionStore } from "@/store/reading-session";
import { Alert, AlertTitle } from "./ui/alert";
import * as z from "zod";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import clsx from "clsx";

const startReadingSessionSchema = z.object({
  startPage: z.number().nonnegative(),
});

export function StartReadingSession({
  icon = false,
  book,
  readingRun,
}: {
  icon?: boolean;
  book: BookDetails;
  readingRun?: Pick<ReadingRun, "id" | "completedPages">;
}) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const session = useReadingSessionStore((state) => state.session);
  const start = useReadingSessionStore((state) => state.start);
  const addReadingRun = useAddReadingRunMutation();

  const isNewRun = !readingRun || readingRun.completedPages === book.totalPages;
  const startPage = isNewRun ? 0 : readingRun.completedPages;
  const totalPages = book.totalPages;

  const defaultValues: z.input<typeof startReadingSessionSchema> = {
    startPage,
  };

  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: {
      onSubmit: startReadingSessionSchema,
      onDynamic: ({ value }) => {
        if (!totalPages) {
          return undefined;
        }

        if (value.startPage < startPage) {
          return { startPage: "Start page cannot be less than " + startPage };
        }

        if (value.startPage > totalPages) {
          return {
            startPage: "Start page cannot be greater than " + totalPages,
          };
        }
      },
    },
    onSubmit: async ({ value }) => {
      const startedAt = new Date().toISOString();

      let startReadingRun = readingRun;

      if (isNewRun) {
        try {
          startReadingRun = await addReadingRun.mutateAsync({
            id: uuidv7(),
            bookId: book.id,
            completedPages: value.startPage,
            startedAt,
          });
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          console.error(error);
          return;
        }
      }

      setOpen(false);

      start(book, startReadingRun!.id, startedAt, value.startPage);

      if (navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
    },
  });

  let ButtonIcon = PlayIcon;
  let buttonLabel = "Start";

  if (readingRun) {
    if (readingRun.completedPages === book.totalPages) {
      ButtonIcon = RotateCcwIcon;
      buttonLabel = "Restart";
    } else if (readingRun.id === session?.runId) {
      ButtonIcon = LoaderIcon;
      buttonLabel = "Reading...";
    } else {
      buttonLabel = "Continue";
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset({ startPage });
      setErrorMessage("");
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size={icon ? "icon" : undefined} disabled={!!session}>
            <ButtonIcon />
            <span className={clsx(icon && "sr-only")}>{buttonLabel}</span>
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
                      min={startPage}
                      max={totalPages}
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
