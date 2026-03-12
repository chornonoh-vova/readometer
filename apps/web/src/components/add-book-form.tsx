import { useAddBookMutation } from "@/lib/books";
import { langToEmoji, langToName } from "@/lib/lang";
import { useForm } from "@tanstack/react-form";
import { isbnSchema } from "isbn";
import { useState } from "react";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { Alert, AlertTitle } from "./ui/alert";
import { Textarea } from "./ui/textarea";
import { AlertCircleIcon } from "lucide-react";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";

const languages = [
  { label: "Select a language", value: "" },
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

const addBookFormSchema = z.object({
  title: z.string().trim().nonempty(),
  totalPages: z.number().positive(),
  author: optionalInput(z.string().trim()),
  language: optionalInput(z.string().trim()),
  publishDate: optionalInput(z.iso.date()),
  isbn: optionalInput(isbnSchema),
  description: optionalInput(z.string().trim()),
});

export function AddBookForm({
  className,
  onClose,
}: {
  className?: string;
  onClose: () => void;
}) {
  const mutation = useAddBookMutation();
  const [errorMessage, setErrorMessage] = useState("");

  const defaultValues: z.input<typeof addBookFormSchema> = {
    title: "",
    totalPages: 0,
    author: "",
    language: "",
    publishDate: "",
    isbn: "",
    description: "",
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: addBookFormSchema,
    },
    onSubmit: ({ value }) => {
      const data = addBookFormSchema.parse(value);

      setErrorMessage("");

      mutation.mutate(
        {
          id: uuidv7(),
          ...data,
        },
        {
          onSuccess: () => {
            onClose();
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
    <form
      id="add-book-form"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Failed to create a new book: {errorMessage}</AlertTitle>
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
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
                <FieldDescription>
                  Number of pages for this book
                </FieldDescription>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  aria-invalid={isInvalid}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  placeholder="123"
                  autoComplete="off"
                  required
                  min={0}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
                <FieldDescription>Full name of the author</FieldDescription>
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
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
                  <FieldLabel htmlFor={field.name}>Book language</FieldLabel>
                  <FieldDescription>Language of the book</FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </FieldContent>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                >
                  {languages.map(({ label, value }) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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
                <FieldDescription>
                  Date, when the book was published
                </FieldDescription>
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
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
                <FieldDescription>
                  ISBN-10 or ISBN-13 code for a book
                </FieldDescription>
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
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
                <FieldDescription>
                  Detailed book description or synopsis
                </FieldDescription>
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
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>
    </form>
  );
}
