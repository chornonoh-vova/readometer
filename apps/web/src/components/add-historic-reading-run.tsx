import { useAddReadingRunMutation } from "@/lib/reading-runs";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { v7 as uuidv7 } from "uuid";
import { useState } from "react";
import { getErrorMessage } from "@/lib/error";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircleIcon, CircleCheckBigIcon } from "lucide-react";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Alert, AlertTitle } from "./ui/alert";
import { Input } from "./ui/input";

const addHistoricReadingRunSchema = z.object({
  startedAt: z.iso.datetime({ local: true }),
  finishedAt: z.iso.datetime({ local: true }),
});

export function AddHistoricReadingRun({
  bookId,
  totalPages,
}: {
  bookId: string;
  totalPages: number;
}) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const addReadingRun = useAddReadingRunMutation();

  const defaultValues: z.input<typeof addHistoricReadingRunSchema> = {
    startedAt: "",
    finishedAt: "",
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: addHistoricReadingRunSchema,
    },
    onSubmit: ({ value }) => {
      setErrorMessage("");

      const startedAt = new Date(value.startedAt).toISOString();
      const finishedAt = new Date(value.finishedAt).toISOString();

      addReadingRun.mutate(
        {
          id: uuidv7(),
          bookId,
          completedPages: totalPages,
          startedAt,
          finishedAt,
        },
        {
          onSuccess: () => {
            setOpen(false);
          },
          onError: (error) => {
            setErrorMessage(getErrorMessage(error));
            console.error(error);
          },
        },
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary">
            <CircleCheckBigIcon />
            Mark completed
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add historic reading run</DialogTitle>
          <DialogDescription>
            Specify the dates in the past when you've read this book
          </DialogDescription>
        </DialogHeader>
        <form
          id="add-historic-reading-run-form"
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
              name="startedAt"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Started at</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="datetime-local"
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

            <form.Field
              name="finishedAt"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Finished at</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="datetime-local"
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
            form="add-historic-reading-run-form"
            type="submit"
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
