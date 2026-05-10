import {
  useDeleteGoalMutation,
  useUpsertGoalMutation,
  type DailyMetric,
} from "@/lib/goals";
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
import {
  FieldGroup,
  Field,
  FieldError,
  FieldLabel,
  FieldContent,
} from "./ui/field";
import { Input } from "./ui/input";
import { Alert, AlertTitle } from "./ui/alert";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";

const setupDailyGoalSchema = z.object({
  target: z.number().int().positive(),
  metric: z.enum(["minutes", "pages"]),
});

export function SetupDailyGoal({
  id,
  current,
  metric,
}: {
  id?: string;
  current?: number;
  metric?: DailyMetric;
}) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const upsertGoal = useUpsertGoalMutation();
  const deleteGoal = useDeleteGoalMutation();

  const defaultValues: z.input<typeof setupDailyGoalSchema> = {
    target: current ?? 0,
    metric: metric ?? "minutes",
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: setupDailyGoalSchema,
    },
    onSubmit: ({ value }) => {
      setErrorMessage("");
      upsertGoal.mutate(
        {
          id: uuidv7(),
          type: "daily",
          metric: value.metric,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="icon">
            <SettingsIcon />
            <span className="sr-only">Setup daily reading goal</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setup the daily reading goal</DialogTitle>
        </DialogHeader>
        <form
          id="setup-daily-goal"
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

            <form.Field
              name="metric"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field orientation="responsive" data-invalid={isInvalid}>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>Measure in</FieldLabel>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </FieldContent>
                    <NativeSelect
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value as "minutes" | "pages",
                        )
                      }
                      aria-invalid={isInvalid}
                    >
                      <NativeSelectOption value="minutes">
                        Minutes
                      </NativeSelectOption>
                      <NativeSelectOption value="pages">
                        Pages
                      </NativeSelectOption>
                    </NativeSelect>
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
              Delete goal
            </Button>
          )}
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={upsertGoal.isPending}
            form="setup-daily-goal"
            type="submit"
          >
            Setup goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
