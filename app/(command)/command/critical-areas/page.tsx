import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Critical Areas" };

export default function CriticalAreasPage() {
  return (
    <ModulePage
      title="Critical Areas"
      description="High-risk critical areas with spatial boundaries and risk classification."
      icon={ShieldAlert}
    />
  );
}
