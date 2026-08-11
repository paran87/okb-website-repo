import type { Metadata } from "next";
import { FileBarChart } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ModulePage
      title="Reports"
      description="Operational reports, analytics, and exportable situational summaries."
      icon={FileBarChart}
    />
  );
}
