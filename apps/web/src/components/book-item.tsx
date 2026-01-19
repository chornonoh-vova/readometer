import type { Book } from "@/lib/books";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Link } from "@tanstack/react-router";
import {
  CircleCheckBigIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

function BookStatus({ book }: { book: Book }) {
  let status: "to-read" | "completed" | "in-progress" = "to-read";

  if (book.completedPages) {
    if (book.completedPages === book.totalPages) {
      status = "completed";
    } else {
      status = "in-progress";
    }
  }

  const variants = {
    "to-read": "secondary",
    "in-progress": "secondary",
    completed: "secondary",
  } as const;

  const classes = {
    "to-read": "",
    "in-progress": "bg-primary text-primary-foreground",
    completed: "bg-blue-500 text-white dark:bg-blue-600",
  } as const;

  const badges = {
    "to-read": "To Read",
    "in-progress": (
      <>
        <LoaderCircleIcon /> In Progress
      </>
    ),
    completed: (
      <>
        <CircleCheckBigIcon /> Completed
      </>
    ),
  } as const;

  return (
    <Badge variant={variants[status]} className={classes[status]}>
      {badges[status]}
    </Badge>
  );
}

function BookProgress({ book }: { book: Book }) {
  const percentage = Math.floor((book.completedPages / book.totalPages) * 100);

  return (
    <div className="grid grid-cols-2 text-muted-foreground text-xs">
      <span>
        {book.completedPages} / {book.totalPages}
      </span>
      <span className="text-right">{percentage} %</span>
      <Progress className="col-span-2" value={percentage} />
    </div>
  );
}

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

        <BookStatus book={book} />
        <BookProgress book={book} />
      </ItemContent>
    </Item>
  );
}
