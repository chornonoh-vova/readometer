import {
  CircularProgress,
  CircularProgressLabel,
  CircularProgressValue,
} from "./ui/circular-progress";

export function GoalProgress({
  actual,
  target,
  metric,
}: {
  actual?: number;
  target?: number;
  metric?: string;
}) {
  const percentage = actual && target ? Math.floor((actual / target) * 100) : 0;

  return (
    <CircularProgress value={percentage} size={56} strokeWidth={5}>
      <CircularProgressValue className="text-xs" />
      {metric && (
        <CircularProgressLabel className="sr-only">
          {actual} / {target} {metric}
        </CircularProgressLabel>
      )}
    </CircularProgress>
  );
}
