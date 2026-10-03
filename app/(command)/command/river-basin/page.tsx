import type { Metadata } from "next";
import { Mountain } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "River Basin" };

export default function RiverBasinPage() {
  return (
    <ModulePage
      title="River Basin"
      description="River basin monitoring, watershed status, and flood-control coverage."
      icon={Mountain}
    />
  );
}
