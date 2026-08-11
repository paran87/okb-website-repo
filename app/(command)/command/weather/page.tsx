import type { Metadata } from "next";
import { CloudRain } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Weather" };

export default function WeatherPage() {
  return (
    <ModulePage
      title="Weather"
      description="Weather intelligence, rainfall forecasts, and severe-weather advisories."
      icon={CloudRain}
    />
  );
}
