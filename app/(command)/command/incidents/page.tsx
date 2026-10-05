import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { IncidentsView } from "@/features/incident/components/incidents-view";

export const metadata: Metadata = { title: "Incidents" };

/** Operator-confirmed incidents, each traceable to its source report. */
export default function IncidentsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Incidents"
        description="Operator-confirmed incidents created from reviewed WhatsApp and Viber reports."
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Incidents" }]}
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <IncidentsView />
      </Suspense>
    </div>
  );
}
