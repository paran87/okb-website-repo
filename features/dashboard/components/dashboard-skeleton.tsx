"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

/** Loading skeleton for the operations dashboard. */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3",
        className,
      )}
    >
      <div className="flex shrink-0 gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-44 shrink-0 rounded-card" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
        <Skeleton className="hidden h-full min-h-0 rounded-card xl:col-span-2 xl:block" />
        <Skeleton className="min-h-[280px] rounded-card xl:col-span-8 xl:min-h-0" />
        <Skeleton className="hidden min-h-0 rounded-card xl:col-span-2 xl:block" />
      </div>
      <Skeleton className="h-28 shrink-0 rounded-card" />
    </div>
  );
}
