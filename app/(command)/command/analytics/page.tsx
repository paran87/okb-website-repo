import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <ModulePage
      title="Analytics"
      description="Operational analytics, trends, and decision-support insights."
      icon={BarChart3}
    />
  );
}
