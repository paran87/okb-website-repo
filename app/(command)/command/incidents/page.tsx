import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Incidents" };

export default function IncidentsPage() {
  return (
    <ModulePage
      title="Incidents"
      description="Track, triage, and coordinate flood-related incident reports."
      icon={AlertTriangle}
    />
  );
}
