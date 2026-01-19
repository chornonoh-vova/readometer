import { useActionState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "./ui/dialog";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { useAddBookMutation } from "@/lib/books";
import * as uuid from "uuid";
import { authClient } from "@/lib/auth-client";

const languages = [
  { label: "Select a language", value: null },
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Italian", value: "it" },
  { label: "Chinese", value: "zh" },
  { label: "Japanese", value: "ja" },
  { label: "Ukrainian", value: "uk" },
];

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

  const addBook = async (_prevState: string | null, formData: FormData) => {
    const title = formData.get("title")!.toString();
    const description = formData.get("description")?.toString();
    const author = formData.get("author")?.toString();
    const totalPages = parseInt(formData.get("total-pages")!.toString());
    const publishDate = formData.get("publish-date")?.toString();
    const language = formData.get("language")?.toString();
    const isbn13 = formData.get("isbn13")?.toString();

    mutation.mutate(
      {
        id: uuid.v7(),
        userId: userId!,
        title,
        description,
        author,
        totalPages,
        publishDate,
        language,
        isbn13,
        updatedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );

    return null;
  };

  const [message, addBookAction] = useActionState(addBook, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh overflow-auto">
        <DialogHeader>Add a new book</DialogHeader>
        <DialogDescription>
          Please enter the information to add a new book to your library
        </DialogDescription>
        <form id="add-book-form" action={addBookAction}>
          <FieldGroup>
            {message && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{message}</AlertTitle>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                type="text"
                name="title"
                placeholder="Example Book"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="total-pages">Total Pages</FieldLabel>
              <Input
                id="total-pages"
                type="number"
                name="total-pages"
                placeholder="123"
                min={0}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="author">Author</FieldLabel>
              <Input
                id="author"
                type="text"
                name="author"
                placeholder="Author"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="language">Language</FieldLabel>
              <Select id="language" name="language" items={languages}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(({ label, value }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="publish-date">Publish Date</FieldLabel>
              <Input
                id="publish-date"
                type="date"
                name="publish-date"
                placeholder="Publish Date"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="isbn13">ISBN-13</FieldLabel>
              <Input
                id="isbn13"
                type="text"
                name="isbn13"
                pattern="\d{13}"
                placeholder="ISBN-13"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                name="description"
                placeholder="Example Book Description"
              />
            </Field>
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
          <Button type="submit" form="add-book-form">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
