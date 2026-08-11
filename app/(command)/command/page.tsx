import type { Metadata } from "next";
import { OperationsDashboard } from "@/features/dashboard/components/operations-dashboard";

export const metadata: Metadata = {
  title: "National Operations Center",
  description:
    "Real-time situational overview for Oplan Kontra Baha flood response operations.",
};

/** National Operations Center dashboard — map-first command center view. */
export default function DashboardPage() {
  return <OperationsDashboard />;
}
