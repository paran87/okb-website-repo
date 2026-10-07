/**
 * Incident feature - domain types.
 */
import type { FloodSeverity } from "./lib/flood-severity";

export type { FloodSeverity } from "./lib/flood-severity";

/**
 * Weather used to decide when flood highlights go back to normal:
 *  - "wet":     rain now, or a PAGASA rainfall / cyclone warning in effect
 *  - "normal":  no rain and no warning
 *  - "unknown": live PAGASA data unavailable (treated like "wet": nothing is cleared early)
 */
export type FloodMapWeatherState = "wet" | "normal" | "unknown";

export interface FloodMapWeather {
  state: FloodMapWeatherState;
  /** Short status, e.g. "No rain, no warnings (PAGASA)". */
  label: string;
  rainfallMmHr: number | null;
  condition: string | null;
  advisories: string[];
  updatedAt: string | null;
}

/** One flooded location from the received reports, currently highlighted. */
export interface FloodMapLocation {
  /** Normalized location key (same place across reports). */
  key: string;
  label: string;
  /** Road names to look for on the road network, e.g. ["Taft Ave", "Pedro Gil St"] for an intersection. */
  roads: string[];
  landmark: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  /** District Engineering Office as written in the report (e.g. "NMDEO"). */
  deo: string | null;
  latitude: number | null;
  longitude: number | null;
  heightM: number | null;
  heightRaw: string | null;
  heightApproximate: boolean;
  severity: FloodSeverity;
  roadStatus: string | null;
  reportId: string;
  reference: string;
  /** When the report was sent (ISO). */
  reportedAt: string;
  groupName: string | null;
  /** When the highlight clears unless a newer report keeps it (ISO). */
  clearsAt: string;
}

export interface FloodMapData {
  generatedAt: string;
  weather: FloodMapWeather;
  /** Hours a flood report stays on the map for the current weather. */
  activeHours: number;
  rule: { wetHours: number; normalHours: number };
  locations: FloodMapLocation[];
  /** Flooded locations no longer shown: a later report said subsided / no flooding. */
  clearedByReport: number;
  /** Flooded locations no longer shown: older than the weather allows (back to normal). */
  clearedByWeather: number;
}
