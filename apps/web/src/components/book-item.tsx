import type { Book } from "@/lib/books";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Link } from "@tanstack/react-router";
import { MoreHorizontalIcon, TrashIcon } from "lucide-react";
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

export function BookItem({ book }: { book: Book }) {
  return (
    <Item variant="outline">
      <ItemContent className="gap-2">
        <div className="flex">
          <Link
            className="grow"
            to="/books/$bookId"
            params={{ bookId: book.id }}
          >
            <ItemTitle className="hover:underline">{book.title}</ItemTitle>
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
                <DropdownMenuItem variant="destructive">
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
          completedPages={book.completedPages}
          totalPages={book.totalPages}
        />
      </ItemContent>
    </Item>
  );
}
