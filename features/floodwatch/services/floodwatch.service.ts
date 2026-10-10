import "server-only";
import type { Feature, FeatureCollection } from "geojson";
import { FLOODWATCH_URL } from "@/lib/constants";
import { ApiError } from "@/lib/api/errors";
import type { FloodwatchArea, FloodwatchSummary } from "@/features/floodwatch/types";

const REVALIDATE_SECONDS = 600;

interface FloodwatchDashboardPayload {
  totalFloodProneAreas: number;
  byRegion: { region: string; count: number }[];
  byProvince: { province: string; count: number }[];
  pendingLocationReviews: number;
  openReports: number;
}

interface FloodwatchAreaItem {
  rowIndex: number;
  region: string;
  province: string;
  municipalityCity: string;
  deo: string;
  barangay: string;
  roadNameWaterways: string;
  kmStationLimit: string;
  latitude: number | null;
  longitude: number | null;
  location?: {
    latitude: number | null;
    longitude: number | null;
    proposedLatitude?: number | null;
    proposedLongitude?: number | null;
    accuracy?: string;
    needsReview?: boolean;
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, FLOODWATCH_URL), {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new ApiError(502, "INTERNAL_ERROR", `Floodwatch responded ${response.status}`);
  }
  const body = (await response.json()) as { success: boolean; data: T };
  if (!body.success) throw new ApiError(502, "INTERNAL_ERROR", "Floodwatch request failed");
  return body.data;
}

/** Reads Floodwatch (Flood Prone Areas tab) data server-side. */
export const floodwatchService = {
  async getSummary(): Promise<FloodwatchSummary> {
    const data = await getJson<FloodwatchDashboardPayload>("api/dashboard");
    return {
      totalAreas: data.totalFloodProneAreas,
      byRegion: data.byRegion.map((r) => ({ label: r.region, count: r.count })),
      byProvince: data.byProvince.map((p) => ({ label: p.province, count: p.count })),
      pendingLocationReviews: data.pendingLocationReviews,
      openReports: data.openReports,
    };
  },

  /** Every row of the Flood Prone Areas tab, with its (confirmed or proposed) position when it has one. */
  async getAreas(): Promise<FloodwatchArea[]> {
    const data = await getJson<{ items: FloodwatchAreaItem[] }>(
      "api/flood-prone-areas?pageSize=5000&page=1",
    );
    return data.items.map((item) => ({
      id: `fw-${item.rowIndex}`,
      road: item.roadNameWaterways?.trim() ?? "",
      limits: item.kmStationLimit?.trim() ?? "",
      barangay: item.barangay?.trim() ?? "",
      municipality: item.municipalityCity?.trim() ?? "",
      province: item.province?.trim() ?? "",
      region: item.region?.trim() ?? "",
      deo: item.deo?.trim() ?? "",
      latitude:
        item.latitude ??
        item.location?.latitude ??
        item.location?.proposedLatitude ??
        null,
      longitude:
        item.longitude ??
        item.location?.longitude ??
        item.location?.proposedLongitude ??
        null,
      approximate: ["municipality", "province", "region"].includes(item.location?.accuracy ?? ""),
      needsReview: Boolean(item.location?.needsReview),
    }));
  },

  /** Every Floodwatch area that has a (confirmed or proposed) position. */
  async getAreasGeoJson(): Promise<FeatureCollection> {
    const features: Feature[] = [];
    for (const area of await this.getAreas()) {
      if (area.latitude === null || area.longitude === null) continue;
      features.push({
        type: "Feature",
        properties: {
          id: area.id,
          title: area.road || "Flood-prone area",
          description: [area.limits, area.barangay, area.municipality]
            .filter(Boolean)
            .join(" · "),
          status: area.needsReview ? "Needs review" : "Located",
          region: area.region,
          province: area.province,
          category: "flood-prone",
        },
        geometry: { type: "Point", coordinates: [area.longitude, area.latitude] },
      });
    }
    return { type: "FeatureCollection", features };
  },
};
