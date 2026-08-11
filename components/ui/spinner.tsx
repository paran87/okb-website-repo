import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SIZE_CLASSES = { sm: "size-4", md: "size-6", lg: "size-8" } as const;

/** Loading spinner with optional label. */
export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2 text-muted-foreground", className)}
    >
      <Loader2 className={cn("animate-spin", SIZE_CLASSES[size])} aria-hidden />
      {label ? <span className="text-caption">{label}</span> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
