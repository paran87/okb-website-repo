import type { Metadata } from "next";
import { Network } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Drainages" };

export default function DrainagesPage() {
  return (
    <ModulePage
      title="Drainages"
      description="Drainage infrastructure monitoring, capacity status, and maintenance coverage."
      icon={Network}
    />
  );
}
