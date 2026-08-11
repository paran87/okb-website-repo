import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <ModulePage
      title="Projects"
      description="Flood-control infrastructure projects with status and geospatial tracking."
      icon={HardHat}
    />
  );
}
