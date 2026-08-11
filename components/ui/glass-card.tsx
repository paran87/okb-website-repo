import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

/** Glassmorphism surface for overlays and floating command panels. */
export function GlassCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass rounded-card shadow-panel", className)}
      {...props}
    />
  );
}
