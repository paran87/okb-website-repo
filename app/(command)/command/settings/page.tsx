import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";
import { AutomatedReports } from "@/features/consolidated-reports/components/automated-reports";
import { CollectorSettings } from "@/features/media-collector/components/collector-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration, preferences, integrations, and platform options."
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Settings" }]}
      />
      <AutomatedReports />
      <CollectorSettings />
    </div>
  );
}
