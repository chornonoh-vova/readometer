import { useDeleteGoalMutation, useUpsertGoalMutation } from "@/lib/goals";
import { useForm } from "@tanstack/react-form";
import { v7 as uuidv7 } from "uuid";
import { useState } from "react";
import * as z from "zod";
import { getErrorMessage } from "@/lib/error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircleIcon, SettingsIcon } from "lucide-react";
import { FieldGroup, Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Alert, AlertTitle } from "./ui/alert";

const setupYearlyGoalSchema = z.object({
  target: z.number().int().positive(),
});

export function SetupYearlyGoal({
  id,
  current,
}: {
  id?: string;
  current?: number;
}) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const upsertGoal = useUpsertGoalMutation();
  const deleteGoal = useDeleteGoalMutation();

  const defaultValues: z.input<typeof setupYearlyGoalSchema> = {
    target: current ?? 0,
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: setupYearlyGoalSchema,
    },
    onSubmit: ({ value }) => {
      setErrorMessage("");
      upsertGoal.mutate(
        {
          id: uuidv7(),
          type: "yearly",
          metric: "books",
          target: value.target,
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

  const handleDelete = () => {
    deleteGoal.mutate(id!, {
      onSuccess: () => {
        setOpen(false);
      },
      onError: (error) => {
        setErrorMessage(getErrorMessage(error));
        console.error(error);
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset({ target: current ?? 0 });
      setErrorMessage("");
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="icon">
            <SettingsIcon />
            <span className="sr-only">Set up yearly reading goal</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set your yearly reading goal</DialogTitle>
        </DialogHeader>
        <form
          id="setup-yearly-goal"
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
              name="target"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Target</FieldLabel>
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
                      min={1}
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
          {id && (
            <Button
              variant="destructive"
              className="sm:mr-auto"
              disabled={deleteGoal.isPending}
              onClick={handleDelete}
            >
              Remove goal
            </Button>
          )}
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={upsertGoal.isPending}
            form="setup-yearly-goal"
            type="submit"
          >
            Save goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
