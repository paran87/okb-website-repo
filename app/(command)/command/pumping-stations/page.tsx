import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Pumping Stations" };

export default function PumpingStationsPage() {
  return (
    <ModulePage
      title="Pumping Stations"
      description="Pumping station monitoring, operating status, and readiness across the network."
      icon={Gauge}
    />
  );
}
