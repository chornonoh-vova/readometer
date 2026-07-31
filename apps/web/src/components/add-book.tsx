import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { AddBookDialog } from "./add-book-dialog";

export function AddBook({
  variant = "default",
}: {
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PlusIcon />
        Add book
      </Button>
      <AddBookDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
