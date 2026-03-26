import type { Book } from "@/lib/books";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Link } from "@tanstack/react-router";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { BookStatus } from "./book-status";
import { BookProgress } from "./book-progress";
import { DeleteBookAlert } from "./delete-book-alert";
import { useState } from "react";
import { EditBookDialog } from "./edit-book-dialog";
import { BookItemCover } from "./book-item-cover";

export function BookItem({ book }: { book: Book }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <Item variant="outline" render={<li />}>
      <BookItemCover book={book} />

      <ItemContent className="gap-2 h-full">
        <div className="flex gap-1 items-start mb-auto">
          <Link
            className="grow group"
            to="/books/$bookId"
            params={{ bookId: book.id }}
          >
            <ItemTitle className="group-hover:underline">
              {book.title}
            </ItemTitle>
            <ItemDescription>{book.author}</ItemDescription>
          </Link>

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
        </div>

        <BookStatus
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />

        <BookProgress
          title={book.title}
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />
      </ItemContent>

      <EditBookDialog book={book} open={editOpen} onOpenChange={setEditOpen} />

      <DeleteBookAlert
        bookId={book.id}
        title={book.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Item>
  );
}
