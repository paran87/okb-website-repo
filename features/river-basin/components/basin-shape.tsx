import type { BasinShape } from "@/lib/river-basin/summary";
import { cn } from "@/utils/cn";

/** The basin's outline, drawn from the boundary data. Inherits the text color. */
export function BasinOutline({
  shape,
  className,
}: {
  shape: BasinShape | null;
  className?: string;
}) {
  if (!shape)
    return (
      <div className={cn("bg-muted/40 rounded-lg", className)} aria-hidden />
    );
  return (
    <svg
      viewBox={`0 0 ${shape.w} ${shape.h}`}
      className={cn("shrink-0", className)}
      fill="currentColor"
      fillRule="evenodd"
      stroke="currentColor"
      strokeWidth={0.8}
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={shape.d} fillOpacity={0.25} />
    </svg>
  );
}
