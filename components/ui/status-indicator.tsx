import { cn } from "@/utils/cn";

export type StatusTone =
  | "online"
  | "offline"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const DOT_CLASSES: Record<StatusTone, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

interface StatusIndicatorProps {
  tone?: StatusTone;
  label?: string;
  pulse?: boolean;
  className?: string;
}

/** Live status dot with optional pulsing halo and label. */
export function StatusIndicator({
  tone = "neutral",
  label,
  pulse = false,
  className,
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex size-2.5">
        {pulse ? (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              DOT_CLASSES[tone],
            )}
          />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-2.5 rounded-full",
            DOT_CLASSES[tone],
          )}
        />
      </span>
      {label ? (
        <span className="text-caption text-foreground">{label}</span>
      ) : null}
    </span>
  );
}
