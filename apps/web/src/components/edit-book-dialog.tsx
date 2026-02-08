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
import { useEditBookMutation, type Book } from "@/lib/books";
import { useForm } from "@tanstack/react-form";
import { langToName, langToEmoji } from "@/lib/lang";
import * as z from "zod";
import { isbnSchema } from "@/lib/isbn";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { format } from "date-fns";

const languages = [
  { label: "Select a language", value: null },
  ...Object.entries(langToName).map(([code, name]) => ({
    label: `${name} ${langToEmoji[code]}`,
    value: code,
  })),
];

const optionalInput = <T extends z.core.SomeType>(schema: T) =>
  z
    .union([schema, z.literal("")])
    .transform((val) => (val === "" ? undefined : val))
    .optional();

const editBookFormSchema = z.object({
  title: z.string().trim().nonempty(),
  totalPages: z.number().positive(),
  author: optionalInput(z.string().trim()),
  language: optionalInput(z.string().trim()),
  publishDate: optionalInput(z.iso.date()),
  isbn: optionalInput(isbnSchema),
  description: optionalInput(z.string().trim()),
});

export function EditBookDialog({
  book,
  open,
  onOpenChange,
}: {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useEditBookMutation();
  const [errorMessage, setErrorMessage] = useState("");

  const defaultValues: z.input<typeof editBookFormSchema> = {
    title: book.title,
    totalPages: book.totalPages,
    author: book.author ?? "",
    language: book.language ?? "",
    publishDate: book.publishDate
      ? format(new Date(book.publishDate), "yyyy-MM-dd")
      : "",
    isbn: book.isbn13 ?? "",
    description: book.description ?? "",
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: editBookFormSchema,
    },
    onSubmit: ({ value }) => {
      const data = editBookFormSchema.parse(value);

      setErrorMessage("");

      mutation.mutate(
        {
          bookId: book.id,
          updatedBook: data,
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
      <DialogContent className="overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle>Edit your book</DialogTitle>
          <DialogDescription>
            Please enter updated information to change book in your library
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-book-form"
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
                  Failed to create a new book: {errorMessage}
                </AlertTitle>
              </Alert>
            )}

            <form.Field
              name="title"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Book title</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="text"
                      aria-invalid={isInvalid}
                      required
                      placeholder="Book title"
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
              name="totalPages"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Total pages</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      aria-invalid={isInvalid}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.valueAsNumber)
                      }
                      placeholder="123"
                      autoComplete="off"
                      required
                      min={0}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="author"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Book author</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="text"
                      aria-invalid={isInvalid}
                      placeholder="Book author"
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
              name="language"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field orientation="responsive" data-invalid={isInvalid}>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>
                        Book language
                      </FieldLabel>
                      <FieldDescription>Language of the book</FieldDescription>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </FieldContent>
                    <Select
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      items={languages}
                      onValueChange={(value) => field.handleChange(value!)}
                    >
                      <SelectTrigger aria-invalid={isInvalid}>
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
                );
              }}
            />

            <form.Field
              name="publishDate"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Publish date</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="date"
                      aria-invalid={isInvalid}
                      placeholder="Publish date"
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
              name="isbn"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>ISBN</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="ISBN"
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
              name="description"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Example book description"
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
            form="edit-book-form"
          >
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
