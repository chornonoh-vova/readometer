import {
  useEditReadingSessionMutation,
  type ReadingSession,
} from "@/lib/reading-sessions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import * as z from "zod";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const editReadingSessionFormSchema = z.object({
  startPage: z.number().positive(),
  endPage: z.number().positive(),
});

export function EditReadingSessionDialog({
  latest,
  session,
  runId,
  bookId,
  totalPages,
  open,
  onOpenChange,
}: {
  latest: boolean;
  session: ReadingSession;
  runId: string;
  bookId: string;
  totalPages: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useEditReadingSessionMutation(session.id, runId, bookId);
  const [errorMessage, setErrorMessage] = useState("");

  const defaultValues: z.input<typeof editReadingSessionFormSchema> = {
    startPage: session.startPage,
    endPage: session.endPage,
  };

  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: {
      onSubmit: editReadingSessionFormSchema,
      onDynamic: ({ value }) => {
        if (value.startPage > totalPages) {
          return {
            startPage: "Start page cannot be greater than " + totalPages,
          };
        }

        if (value.endPage > totalPages) {
          return { endPage: "End page cannot be greater than " + totalPages };
        }

        if (value.startPage > value.endPage) {
          return { startPage: "Start page cannot be greater than end page" };
        }
      },
    },
    onSubmit: async ({ value }) => {
      const data = editReadingSessionFormSchema.parse(value);

      setErrorMessage("");

      mutation.mutate(
        {
          ...data,
          updateRun: latest,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
          onError: (error) => {
            if (
              error.cause &&
              typeof error.cause === "object" &&
              "message" in error.cause &&
              typeof error.cause.message === "string"
            ) {
              setErrorMessage(error.cause.message);
            } else {
              setErrorMessage(error.message);
              console.error(error);
            }
          },
        },
      );
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        form.reset();
        setErrorMessage("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit reading session</DialogTitle>
          <DialogDescription>
            Please enter updated information for this reading session
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-reading-session-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>
                  Failed to edit a reading session: {errorMessage}
                </AlertTitle>
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
                      min={0}
                      max={totalPages}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="endPage"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>End page</FieldLabel>
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
                      min={0}
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
          <DialogClose
            render={
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            }
          />
          <Button
            disabled={mutation.isPending}
            type="submit"
            form="edit-reading-session-form"
          >
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
