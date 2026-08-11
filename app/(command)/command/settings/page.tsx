import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ModulePage
      title="Settings"
      description="System configuration, preferences, integrations, and platform options."
      icon={Settings}
    />
  );
}
