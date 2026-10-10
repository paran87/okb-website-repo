"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsGate } from "@/features/reports/components/reports-gate";

/** Reloads the page once access is granted, so the server renders it with the data. */
function Reload() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return <Skeleton className="h-40 w-full" />;
}

/** Shown instead of the progress page until the operator enters the access key (restricted for now). */
export function AccomplishmentLocked() {
  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-5 sm:py-10">
      <ReportsGate area="operations" bare note="Dredging and desilting progress is only shown to authorized operators for now.">
        {() => <Reload />}
      </ReportsGate>
    </div>
  );
}
