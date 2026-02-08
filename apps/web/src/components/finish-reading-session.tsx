import { useState } from "react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { useReadingSessionStore } from "@/store/reading-session";
import { useAddReadingSessionMutation } from "@/lib/reading-sessions";
import { v7 as uuidv7 } from "uuid";
import { Alert, AlertTitle } from "./ui/alert";
import * as z from "zod";
import { useForm } from "@tanstack/react-form";

const finishReadingSessionSchema = z.object({
  endPage: z.number().positive(),
});

export function FinishReadingSession() {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const session = useReadingSessionStore((state) => state.session);
  const pause = useReadingSessionStore((state) => state.pause);
  const finish = useReadingSessionStore((state) => state.finish);
  const addReadingSession = useAddReadingSessionMutation(session!.book.id);

  const defaultValues: z.input<typeof finishReadingSessionSchema> = {
    endPage: session?.startPage ?? 0,
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: finishReadingSessionSchema,
    },
    onSubmit: ({ value }) => {
      if (!session) {
        return;
      }

      setErrorMessage("");

      addReadingSession.mutate(
        {
          id: uuidv7(),
          runId: session.runId,
          startPage: session.startPage,
          endPage: value.endPage,
          startTime: session.startedAt,
          endTime: session.lastPausedAt!,
          readTime: Math.floor(session.readTime),
        },
        {
          onSuccess: () => {
            setOpen(false);
            finish();
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
        <form
          id="finish-reading-form"
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
