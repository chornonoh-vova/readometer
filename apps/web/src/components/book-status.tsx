import { BookIcon, CircleCheckBigIcon, LoaderCircleIcon } from "lucide-react";
import { getBookStatus } from "@/lib/books";
import { Badge } from "./ui/badge";

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
  "to-read": (
    <>
      <BookIcon data-icon="inline-start" /> To Read
    </>
  ),
  "in-progress": (
    <>
      <LoaderCircleIcon data-icon="inline-start" /> In Progress
    </>
  ),
  completed: (
    <>
      <CircleCheckBigIcon data-icon="inline-start" /> Completed
    </>
  ),
} as const;

export function BookStatus({
  completedPages,
  totalPages,
}: {
  completedPages: number;
  totalPages: number;
}) {
  const status = getBookStatus(completedPages, totalPages);

  return (
    <Badge variant={variants[status]} className={classes[status]}>
      {badges[status]}
    </Badge>
  );
}
