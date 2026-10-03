import { geoJsonService } from "@/features/map/services/geojson.service";

export interface FloodZoneRow {
  id: string;
  title: string;
  floodProne: boolean;
}

/** Flood-prone zones as drawn on the Overview map (flood-zones layer). */
export async function getFloodZones(): Promise<FloodZoneRow[]> {
  const data = await geoJsonService.get("flood-zones");
  return data.features.map((feature) => ({
    id: String(feature.properties?.id ?? feature.id ?? ""),
    title: String(feature.properties?.title ?? "Flood zone"),
    floodProne: feature.properties?.riskLevel === "flood-prone",
  }));
}
