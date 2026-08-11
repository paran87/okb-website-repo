import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const COL_CLASSES: Record<NonNullable<ResponsiveGridProps["cols"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  12: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12",
};

const GAP_CLASSES: Record<NonNullable<ResponsiveGridProps["gap"]>, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

/** Responsive CSS grid with preset column breakpoints. */
export function ResponsiveGrid({
  children,
  cols = 3,
  gap = "md",
  className,
}: ResponsiveGridProps) {
  return (
    <div
      className={cn("grid", COL_CLASSES[cols], GAP_CLASSES[gap], className)}
    >
      {children}
    </div>
  );
}

/** KPI / card grid preset (2 → 4 columns). */
export function CardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveGrid cols={4} gap="md" className={className}>
      {children}
    </ResponsiveGrid>
  );
}

/** Dashboard grid preset (sidebar + main or multi-panel). */
export function DashboardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

const SPAN_CLASSES: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

export function DashboardGridItem({
  children,
  span = 12,
  className,
}: {
  children: ReactNode;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", SPAN_CLASSES[span], className)}>
      {children}
    </div>
  );
}
