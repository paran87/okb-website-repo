import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Equipment" };

export default function EquipmentPage() {
  return (
    <ModulePage
      title="Equipment"
      description="Response equipment inventory, deployment status, and location tracking."
      icon={Truck}
    />
  );
}
