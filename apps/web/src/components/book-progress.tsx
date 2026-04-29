import type { ComponentPropsWithoutRef } from "react";
import { Progress, ProgressLabel, ProgressValue } from "./ui/progress";
import { cn } from "@/lib/utils";
import { progressPercentage } from "@/lib/books";

export function BookProgress({
  title,
  completedPages,
  totalPages,
  className,
  ...rest
}: {
  title: string;
  completedPages: number;
  totalPages: number;
} & ComponentPropsWithoutRef<"div">) {
  const percentage = progressPercentage(completedPages, totalPages);

  return (
    <Progress className={cn("gap-1", className)} value={percentage} {...rest}>
      <ProgressLabel className="text-xs">
        <span className="sr-only">{title}</span>
        {completedPages} / {totalPages}
      </ProgressLabel>
      <ProgressValue className="text-xs" />
    </Progress>
  );
}
