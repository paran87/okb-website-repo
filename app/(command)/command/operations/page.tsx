import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Operations" };

export default function OperationsPage() {
  return (
    <ModulePage
      title="Operations"
      description="Field operations, deployment coordination, and daily operational status."
      icon={ClipboardList}
    />
  );
}
