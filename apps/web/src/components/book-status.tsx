import {
  BookIcon,
  CircleCheckBigIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
import { getBookStatus } from "@/lib/books";
import { Badge } from "./ui/badge";

const variants = {
  "to-read": "secondary",
  abandoned: "destructive",
  "in-progress": "secondary",
  completed: "secondary",
} as const;

const classes = {
  "to-read": "",
  abandoned: "",
  "in-progress": "bg-primary text-primary-foreground",
  completed: "bg-blue-500 text-white dark:bg-blue-600",
} as const;

const badges = {
  "to-read": (
    <>
      <BookIcon data-icon="inline-start" /> To Read
    </>
  ),
  abandoned: (
    <>
      <XIcon data-icon="inline-start" /> Abandoned
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
  abandoned = false,
}: {
  completedPages: number;
  totalPages: number;
  abandoned?: boolean;
}) {
  const status = getBookStatus(completedPages, totalPages, abandoned);

  return (
    <Badge variant={variants[status]} className={classes[status]}>
      {badges[status]}
    </Badge>
  );
}
