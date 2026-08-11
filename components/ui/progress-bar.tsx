import { cn } from "@/utils/cn";
import { clamp } from "@/utils/validation";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Determinate progress bar. */
export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  showLabel = false,
  size = "md",
  className,
}: ProgressBarProps) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            TONE_CLASSES[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="w-10 shrink-0 text-right font-mono text-caption text-muted-foreground">
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
  );
}
