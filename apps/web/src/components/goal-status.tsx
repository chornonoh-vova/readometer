import { CircleCheckBigIcon, LoaderCircleIcon } from "lucide-react";
import { Badge } from "./ui/badge";

const variants = {
  unset: "secondary",
  "in-progress": "secondary",
  completed: "secondary",
} as const;

const classes = {
  unset: "",
  "in-progress": "bg-primary text-primary-foreground",
  completed: "bg-blue-500 text-white dark:bg-blue-600",
} as const;

const badges = {
  unset: "Not set",
  "in-progress": <LoaderCircleIcon data-icon="inline-start" />,
  completed: <CircleCheckBigIcon data-icon="inline-start" />,
} as const;

export function GoalStatus({
  actual,
  target,
  metric,
}: {
  actual?: number;
  target?: number;
  metric?: string;
}) {
  let status: "unset" | "completed" | "in-progress" = "unset";

  if (actual !== undefined && target !== undefined) {
    if (actual >= target) {
      status = "completed";
    } else {
      status = "in-progress";
    }
  }

  return (
    <Badge variant={variants[status]} className={classes[status]}>
      {badges[status]}{" "}
      {actual !== undefined && target !== undefined && (
        <>
          {actual} / {target} {metric}
        </>
      )}
    </Badge>
  );
}
