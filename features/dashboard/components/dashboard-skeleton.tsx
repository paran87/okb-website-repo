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
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 min-w-0 flex-1 rounded-card" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
        <Skeleton className="hidden h-full min-h-0 rounded-card xl:col-span-3 xl:block" />
        <Skeleton className="min-h-[280px] rounded-card xl:col-span-6 xl:min-h-0" />
        <Skeleton className="hidden min-h-0 rounded-card xl:col-span-3 xl:block" />
      </div>
    </div>
  );
}
