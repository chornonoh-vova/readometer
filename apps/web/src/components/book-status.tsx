import { CircleCheckBigIcon, LoaderCircleIcon } from "lucide-react";
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

export function BookStatus({
  completedPages,
  totalPages,
}: {
  completedPages: number;
  totalPages: number;
}) {
  let status: "to-read" | "completed" | "in-progress" = "to-read";

  if (completedPages) {
    if (completedPages === totalPages) {
      status = "completed";
    } else {
      status = "in-progress";
    }
  }

  return (
    <Badge variant={variants[status]} className={classes[status]}>
      {badges[status]}
    </Badge>
  );
}
