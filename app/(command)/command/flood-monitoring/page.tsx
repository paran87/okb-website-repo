import type { Metadata } from "next";
import { FloodMonitoringMap } from "@/features/map/components/flood-monitoring-map";

export const metadata: Metadata = { title: "Flood Monitoring" };

/** GIS-first flood monitoring workspace powered by the MapEngine. */
export default function FloodMonitoringPage() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <header className="shrink-0">
        <h1 className="text-heading text-foreground">Flood Monitoring</h1>
        <p className="text-body text-muted-foreground">
          National GIS situational awareness — mock operational layers active.
        </p>
      </header>
      <FloodMonitoringMap />
    </div>
  );
}
