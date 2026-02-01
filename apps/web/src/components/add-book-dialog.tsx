import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useAddBookMutation } from "@/lib/books";
import { v7 as uuidv7 } from "uuid";
import { authClient } from "@/lib/auth-client";
import { langToName, langToEmoji } from "@/lib/lang";
import z from "zod";
import { isbnSchema } from "@/lib/isbn";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertCircleIcon } from "lucide-react";

const languages = [
  { label: "Select a language", value: null },
  ...Object.entries(langToName).map(([code, name]) => ({
    label: `${name} ${langToEmoji[code]}`,
    value: code,
  })),
];

const addBookFormSchema = z.object({
  title: z.string().trim().nonempty(),
  totalPages: z.number().positive(),
  author: z.string().trim().optional(),
  language: z.string().trim().optional(),
  publishDate: z.iso.date().optional().catch(undefined),
  isbn13: isbnSchema,
  description: z.string().trim().optional(),
});

type AddBookForm = z.infer<typeof addBookFormSchema>;

export function AddBookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const mutation = useAddBookMutation();
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<AddBookForm>({
    resolver: zodResolver(addBookFormSchema),
    defaultValues: {
      title: "",
      totalPages: 0,
      author: "",
      language: "",
      publishDate: "",
      isbn13: "",
      description: "",
    },
  });

  const onSubmit = (data: AddBookForm) => {
    setErrorMessage("");

    mutation.mutate(
      {
        id: uuidv7(),
        userId: userId!,
        ...data,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (error) => {
          setErrorMessage(error.cause?.message ?? "");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        form.reset();
        setErrorMessage("");
      }}
    >
      <DialogContent className="overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle>Add a new book</DialogTitle>
          <DialogDescription>
            Please enter the information to add a new book to your library
          </DialogDescription>
        </DialogHeader>
        <form id="add-book-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>
                  Failed to create a new book: {errorMessage}
                </AlertTitle>
              </Alert>
            )}

            <Controller
              name="title"
              control={form.control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Book title</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="text"
                    aria-invalid={fieldState.invalid}
                    placeholder="Book title"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="totalPages"
              control={form.control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Total pages</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      field.onChange(isNaN(value) ? "" : value);
                    }}
                    placeholder="123"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="author"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Book author</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="text"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="language"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="responsive"
                  data-invalid={fieldState.invalid}
                >
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>Book language</FieldLabel>
                    <FieldDescription>Language of the book</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Select
                    id={field.name}
                    name={field.name}
                    value={field.value}
                    items={languages}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              name="publishDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Publish Date</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="date"
                    placeholder="Publish Date"
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : value);
                    }}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="isbn13"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>ISBN-13</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="ISBN"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Example Book Description"
                  />
                  <FieldDescription>
                    Write here the more detailed book description
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
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
            form="add-book-form"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
