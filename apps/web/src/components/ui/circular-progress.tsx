"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

interface CircularProgressProps extends ProgressPrimitive.Root.Props {
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  className,
  children,
  value,
  size = 80,
  strokeWidth = 8,
  ...props
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped =
    typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="circular-progress"
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <ProgressPrimitive.Track
          render={
            <circle
              data-slot="circular-progress-track"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              fill="none"
              className="stroke-primary/10"
            />
          }
        />
        <ProgressPrimitive.Indicator
          render={
            <circle
              data-slot="circular-progress-indicator"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
            />
          }
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </ProgressPrimitive.Root>
  );
}

function CircularProgressLabel({
  className,
  ...props
}: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="circular-progress-label"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function CircularProgressValue({
  className,
  ...props
}: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="circular-progress-value"
      className={cn("text-sm font-medium tabular-nums", className)}
      {...props}
    />
  );
}

export { CircularProgress, CircularProgressLabel, CircularProgressValue };
