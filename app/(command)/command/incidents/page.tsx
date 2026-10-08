import { Suspense } from "react";
import type { Metadata } from "next";
import { LiveDot } from "@/components/layout/navigation-item";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { IncidentsView } from "@/features/incident/components/incidents-view";

export const metadata: Metadata = { title: "Incidents" };

/** Operator-confirmed incidents, each traceable to its source report. */
export default function IncidentsPage() {
  return (
    // Phones: the map fills the screen (its own floating header); from sm up the page header and panels.
    <div className="flex min-h-0 flex-1 flex-col sm:block sm:space-y-5">
      <PageHeader
        compact
        className="hidden sm:block"
        title="Incidents"
        description="Live flood map from the received reports, and operator-confirmed incidents from reviewed WhatsApp and Viber reports."
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Incidents" }]}
        actions={
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-danger/40 bg-danger/12 px-2.5 text-[11px] font-bold uppercase tracking-wider text-danger">
            <LiveDot />
            Live · updates every minute
          </span>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full flex-1" />}>
        <IncidentsView />
      </Suspense>
    </div>
  );
}
