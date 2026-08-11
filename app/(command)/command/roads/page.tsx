import type { Metadata } from "next";
import { Route } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Road Network" };

export default function RoadsPage() {
  return (
    <ModulePage
      title="Road Network"
      description="Monitor road closures, flood impacts, and highway corridor status."
      icon={Route}
    />
  );
}
