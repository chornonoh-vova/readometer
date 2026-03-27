import type { ComponentPropsWithoutRef } from "react";
import { Progress } from "./ui/progress";
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
    <div
      className={cn(
        "grid grid-cols-2 text-muted-foreground text-xs gap-1",
        className,
      )}
      {...rest}
    >
      <span>
        {completedPages} / {totalPages}
      </span>
      <span className="text-right">{percentage} %</span>
      <Progress
        className="col-span-2"
        value={percentage}
        aria-label={`Progress for ${title}`}
      />
    </div>
  );
}
