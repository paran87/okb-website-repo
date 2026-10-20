/**
 * Choices on the mobile flood report form.
 *
 * Flood heights follow the MMDA flood gauge everyone in Metro Manila knows ("gutter deep", "knee deep",
 * "tire deep", …), each with its depth in meters so the Command Center can color the map by severity
 * (features/incident/lib/flood-severity.ts). The road status a level usually means is suggested, never forced.
 */

export type FloodLevelId =
  | "gutter"
  | "half_knee"
  | "half_tire"
  | "knee"
  | "tire"
  | "waist"
  | "chest"
  | "above_head";

export type RoadStatusId = "passable_all" | "not_passable_light" | "not_passable_all";

export interface FloodLevel {
  id: FloodLevelId;
  label: string;
  /** Depth in meters (MMDA gauge). */
  meters: number;
  /** Depth as people say it, e.g. "8 in". */
  inches: string;
  road: RoadStatusId;
}

export const FLOOD_LEVELS: readonly FloodLevel[] = [
  { id: "gutter", label: "Gutter deep", meters: 0.2, inches: "8 in", road: "passable_all" },
  { id: "half_knee", label: "Half-knee deep", meters: 0.25, inches: "10 in", road: "passable_all" },
  { id: "half_tire", label: "Half-tire deep", meters: 0.33, inches: "13 in", road: "not_passable_light" },
  { id: "knee", label: "Knee deep", meters: 0.48, inches: "19 in", road: "not_passable_light" },
  { id: "tire", label: "Tire deep", meters: 0.66, inches: "26 in", road: "not_passable_all" },
  { id: "waist", label: "Waist deep", meters: 0.94, inches: "37 in", road: "not_passable_all" },
  { id: "chest", label: "Chest deep", meters: 1.14, inches: "45 in", road: "not_passable_all" },
  { id: "above_head", label: "Above head", meters: 1.7, inches: "5.5 ft+", road: "not_passable_all" },
];

export const ROAD_STATUSES: readonly { id: RoadStatusId; label: string; short: string }[] = [
  { id: "passable_all", label: "Passable to all vehicles", short: "Passable" },
  { id: "not_passable_light", label: "Not passable to light vehicles", short: "No light vehicles" },
  { id: "not_passable_all", label: "Not passable to all vehicles", short: "Impassable" },
];

export type WeatherId = "clear" | "cloudy" | "light_rain" | "moderate_rain" | "heavy_rain" | "torrential_rain" | "thunderstorm";

export const WEATHER: readonly { id: WeatherId; label: string; emoji: string }[] = [
  { id: "clear", label: "Clear / sunny", emoji: "☀️" },
  { id: "cloudy", label: "Cloudy", emoji: "☁️" },
  { id: "light_rain", label: "Light rain", emoji: "🌦️" },
  { id: "moderate_rain", label: "Moderate rain", emoji: "🌧️" },
  { id: "heavy_rain", label: "Heavy rain", emoji: "🌧️" },
  { id: "torrential_rain", label: "Torrential rain", emoji: "⛈️" },
  { id: "thunderstorm", label: "Thunderstorm", emoji: "🌩️" },
];

/**
 * DPWH District Engineering Offices in Metro Manila (as named on the road network), shown as short names
 * ("North Manila DEO") so they fit the DEO column of the automated report's PDF.
 */
export const NCR_DEOS = [
  "North Manila DEO",
  "South Manila DEO",
  "Metro Manila 1st DEO",
  "Metro Manila 2nd DEO",
  "Metro Manila 3rd DEO",
  "Quezon City 1st DEO",
  "Quezon City 2nd DEO",
  "Malabon-Navotas DEO",
  "Las Piñas-Muntinlupa DEO",
] as const;

/** "North Manila District Engineering Office" → "North Manila DEO". */
export function shortDeo(name: string): string {
  return name.replace(/\s*District\s+Engineering\s+Office\b/i, " DEO").replace(/\s+/g, " ").trim();
}

export const MAX_PHOTOS = 5;

/** Largest photo the server accepts (the page sends ~0.3–0.8 MB JPEGs; Vercel caps a request at 4.5 MB). */
export const MAX_PHOTO_BYTES = 3_500_000;

/** One video per report, recorded on the page (no sound), up to this size; it goes straight to storage. */
export const MAX_VIDEOS = 1;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
/** Videos stop on their own at this length too (the size limit usually comes first). */
export const MAX_VIDEO_SECONDS = 5 * 60;

export function floodLevel(id: string | null | undefined): FloodLevel | null {
  return FLOOD_LEVELS.find((l) => l.id === id) ?? null;
}

export function roadStatus(id: string | null | undefined) {
  return ROAD_STATUSES.find((r) => r.id === id) ?? null;
}

export function weather(id: string | null | undefined) {
  return WEATHER.find((w) => w.id === id) ?? null;
}

/** "0.48 m" / "48 cm". */
export function formatDepth(meters: number): string {
  return meters < 1 ? `${Math.round(meters * 100)} cm` : `${meters.toFixed(2)} m`;
}

/** Inside the Philippines (generous box around the archipelago). */
export function inPhilippines(lat: number, lng: number): boolean {
  return lat >= 4 && lat <= 21.5 && lng >= 116 && lng <= 127.5;
}

/** "14.599512N 120.984222E", the way GPS camera apps stamp photos. */
export function formatCoordinates(lat: number, lng: number, digits = 6): string {
  return `${Math.abs(lat).toFixed(digits)}${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(digits)}${lng >= 0 ? "E" : "W"}`;
}
