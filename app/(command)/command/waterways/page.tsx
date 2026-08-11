import type { Metadata } from "next";
import { GitBranch } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Waterways" };

export default function WaterwaysPage() {
  return (
    <ModulePage
      title="Waterways"
      description="River levels, drainage systems, and waterway infrastructure monitoring."
      icon={GitBranch}
    />
  );
}
