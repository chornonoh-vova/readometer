import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { EditBookDialog } from "./edit-book-dialog";
import { DeleteBookAlert } from "./delete-book-alert";
import type { Book } from "@/lib/books";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function BookDetailsMenu({ book }: { book: Book }) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              aria-label={`Open ${book.title} menu`}
              size="icon-sm"
            >
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <TrashIcon /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditBookDialog book={book} open={editOpen} onOpenChange={setEditOpen} />

      <DeleteBookAlert
        bookId={book.id}
        title={book.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => navigate({ to: "/" })}
      />
    </>
  );
}
