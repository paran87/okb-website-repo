import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  /** Any CSS color (e.g. a design token: "var(--flood-major)"). */
  color?: string;
}

/**
 * Small labeling tag. Optionally tinted with an arbitrary token color for
 * domain signaling (flood/weather/equipment palettes).
 */
export function Tag({ color, className, style, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-caption font-medium",
        !color && "border-border bg-muted text-muted-foreground",
        className,
      )}
      style={
        color
          ? {
              color,
              borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              ...style,
            }
          : style
      }
      {...props}
    >
      {children}
    </span>
  );
}
