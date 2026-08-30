import type { Metadata } from "next";
import { PagasaWeatherBoard } from "@/features/weather/components/pagasa-weather-board";
import { WeatherMap } from "@/features/weather/components/weather-map";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Weather" };

export default function WeatherPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Weather"
        description="Philippines weather intelligence — PAGASA-style public forecast, advisories, and regional outlook for flood operations."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Weather" },
        ]}
      />
      <WeatherMap />
      <PagasaWeatherBoard />
    </div>
  );
}
