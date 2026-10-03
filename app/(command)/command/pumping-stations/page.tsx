import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pumping Stations",
  description:
    "DPWH pumping station monitoring, operationality, and nationwide mobile pump inventory.",
};

export default function PumpingStationsPage() {
  return (
    <iframe
      src="/pumping-stations/dashboard.html"
      title="DPWH Pumping Stations Dashboard"
      className="h-full min-h-0 w-full flex-1 border-0 bg-[#eef3f8]"
    />
  );
}
