import { Progress } from "./ui/progress";

export function BookProgress({
  title,
  completedPages,
  totalPages,
}: {
  title: string;
  completedPages: number;
  totalPages: number;
}) {
  const percentage = Math.floor((completedPages / totalPages) * 100);

  return (
    <div className="grid grid-cols-2 text-muted-foreground text-xs gap-1">
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
