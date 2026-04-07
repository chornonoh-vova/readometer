import type { ComponentPropsWithoutRef } from "react";
import { Progress, ProgressLabel, ProgressValue } from "./ui/progress";
import { cn } from "@/lib/utils";

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
  const percentage = Math.floor((completedPages / totalPages) * 100);

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
