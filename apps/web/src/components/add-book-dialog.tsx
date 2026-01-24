import { useActionState } from "react";
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
import { v7 as uuidv7 } from "uuid";
import { authClient } from "@/lib/auth-client";
import { langToName, langToEmoji } from "@/lib/lang";

const languages = [
  { label: "Select a language", value: null },
  ...Object.entries(langToName).map(([code, name]) => ({
    label: `${name} ${langToEmoji[code]}`,
    value: code,
  })),
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
    const description = formData.get("description")?.toString() ?? null;
    const author = formData.get("author")?.toString() ?? null;
    const totalPages = parseInt(formData.get("total-pages")!.toString());
    const publishDate = formData.get("publish-date")?.toString() ?? null;
    const language = formData.get("language")?.toString() ?? null;
    const isbn13 = formData.get("isbn13")?.toString() ?? null;

    mutation.mutate(
      {
        id: uuidv7(),
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
      <DialogContent className="overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle>Add a new book</DialogTitle>
          <DialogDescription>
            Please enter the information to add a new book to your library
          </DialogDescription>
        </DialogHeader>
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
                <SelectContent alignItemWithTrigger={false}>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
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
