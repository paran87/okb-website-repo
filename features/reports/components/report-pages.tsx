"use client";

import { useState } from "react";
import { ReportListView } from "@/features/reports/components/report-list-view";
import { AiSituationView } from "@/features/reports/components/ai-situation-view";
import { ReportAnalyticsView } from "@/features/reports/components/report-analytics-view";
import { ReportDetailView } from "@/features/reports/components/report-detail";
import { CreateIncidentModal } from "@/features/reports/components/create-incident-modal";
import { ReportsPage } from "@/features/reports/components/reports-page";

export function IncomingReportsPage() {
  return (
    <ReportsPage title="Incoming Reports" description="Monitor and review operational reports received from WhatsApp and Viber.">
      {(access) => <ReportListView variant="incoming" access={access} />}
    </ReportsPage>
  );
}

export function ReportsArchivePage() {
  return (
    <ReportsPage
      title="Reports Archive"
      description="Search the full history of WhatsApp and Viber reports by text, source, office, location and date."
    >
      {(access) => <ReportListView variant="archive" access={access} />}
    </ReportsPage>
  );
}

export function AiSituationPage() {
  return (
    <ReportsPage title="AI Situation Summary" description="AI-assisted operational intelligence derived from incoming reports.">
      {() => <AiSituationView />}
    </ReportsPage>
  );
}

export function ReportAnalyticsPage() {
  return (
    <ReportsPage title="Analytics" description="Report volume, sources, processing and flood conditions over time.">
      {() => <ReportAnalyticsView />}
    </ReportsPage>
  );
}

export function ReportDetailPage({ id }: { id: string }) {
  const [incidentFor, setIncidentFor] = useState<string | null>(null);
  return (
    <ReportsPage title="Report Details" description="Original message, AI interpretation, situation change and audit trail.">
      {() => (
        <>
          <ReportDetailView id={id} variant="page" onCreateIncident={setIncidentFor} />
          <CreateIncidentModal reportId={incidentFor} onClose={() => setIncidentFor(null)} />
        </>
      )}
    </ReportsPage>
  );
}
