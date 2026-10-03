import "server-only";
import type { Feature, FeatureCollection } from "geojson";
import { FLOODWATCH_URL } from "@/lib/constants";
import { ApiError } from "@/lib/api/errors";
import type { FloodwatchSummary } from "@/features/floodwatch/types";

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

  /** Every Floodwatch area that has a (confirmed or proposed) position. */
  async getAreasGeoJson(): Promise<FeatureCollection> {
    const data = await getJson<{ items: FloodwatchAreaItem[] }>(
      "api/flood-prone-areas?pageSize=5000&page=1",
    );
    const features: Feature[] = [];
    for (const item of data.items) {
      const lat =
        item.latitude ??
        item.location?.latitude ??
        item.location?.proposedLatitude ??
        null;
      const lng =
        item.longitude ??
        item.location?.longitude ??
        item.location?.proposedLongitude ??
        null;
      if (lat === null || lng === null) continue;
      features.push({
        type: "Feature",
        properties: {
          id: `fw-${item.rowIndex}`,
          title: item.roadNameWaterways || "Flood-prone area",
          description: [item.kmStationLimit, item.barangay, item.municipalityCity]
            .filter(Boolean)
            .join(" · "),
          status: item.location?.needsReview ? "Needs review" : "Located",
          region: item.region,
          province: item.province,
          category: "flood-prone",
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
    return { type: "FeatureCollection", features };
  },
};
