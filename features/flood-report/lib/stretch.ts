/**
 * When the photos of one OKB Mobile report were taken far enough apart, the flood is drawn as a stretch of
 * road from the first flooded photo to the last instead of a single pin. These are the standards the server
 * applies (features/flood-report/server/stretch.ts); the details sheet explains the outcome with them.
 */

/** Photos closer than this (meters) show one spot: a pin, not a stretch. */
export const STRETCH_MIN_M = 50;
/** Photos farther apart than this (meters) are too far for one flood report: a pin, checked by operators. */
export const STRETCH_MAX_M = 2000;
/** Photos whose GPS is less precise than this (± meters) are not used to draw a stretch. */
export const STRETCH_ACCURACY_M = 50;
/** A photo this far (meters) from a national road (or an OpenStreetMap street) is not on it. */
export const STRETCH_ON_ROAD_M = 35;
/** The road route may be this much longer than the straight distance (ratio, plus 100 m) before it counts as another road. */
export const STRETCH_MAX_DETOUR = 1.6;
/** Faster than this (km/h) between two photos is not someone moving through a flood. */
export const STRETCH_MAX_SPEED_KMH = 60;
/** Photos taken further apart in time than this (hours) show different moments of the flood. */
export const STRETCH_MAX_SPAN_H = 3;

/** A video counts as filmed on the move when the phone went at least this far (meters) from its start to its end. */
export const VIDEO_MOVE_MIN_M = 10;
/** GPS fixes of a video less precise than this (± meters) are left out. */
export const VIDEO_TRACK_ACCURACY_M = 30;
/** The start and the end of a video are the average of its fixes in its first and last seconds. */
export const VIDEO_END_SECONDS = 3;

/**
 * How the photos of a report were placed:
 *  - stretch: drawn along the road between the two farthest flooded photos;
 *  - single_photo / one_spot: one pin (one photo, or all photos within STRETCH_MIN_M);
 *  - every other outcome: one pin at the reported location, with the reason kept for operators.
 */
export type StretchResult =
  | "stretch"
  | "single_photo"
  | "one_spot"
  | "low_accuracy"
  | "too_far"
  | "unrealistic"
  | "off_network"
  | "not_connected"
  | "indirect"
  | "not_flooded";

/** What the AI saw in one photo. */
export interface PhotoVerdict {
  flooded: "yes" | "no" | "unclear";
  /** A few words on what the photo shows. */
  note: string;
}

/** Stored with the report (`record.mobile.stretch`). */
export interface StoredStretch {
  /** 2: OpenStreetMap streets are tried when the photos are not on a national road. */
  version: 1 | 2;
  analyzedAt: string;
  result: StretchResult;
  /** Why, in plain words (shown in the details sheet and to operators). */
  reason: string;
  /** The flooded road, [lng, lat] (stretch only). */
  line: [number, number][] | null;
  lengthM: number | null;
  /** Road names along the stretch, in order. */
  roads: string[];
  /** Halfway along the stretch, [lng, lat]: where its pin sits. */
  mid: [number, number] | null;
  /** Photo numbers (1-based, as the sender took them) at the two ends. */
  ends: [number, number] | null;
  /** AI photo check per photo key; "not_needed" when the photos were not far enough apart to matter. */
  photoCheck: "ai" | "not_configured" | "failed" | "not_needed";
  verdicts: Record<string, PhotoVerdict>;
}

/** The stretch as the maps draw it. */
export interface FloodStretch {
  line: [number, number][];
  lengthM: number;
  roads: string[];
  mid: [number, number];
  ends: [number, number];
}

/** "420 m", "1.3 km". */
export function formatMeters(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10 || Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(/\.0$/, "")} km`;
}

const pair = (v: unknown): [number, number] | null =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n)) ? (v as [number, number]) : null;

/**
 * A stored analysis (`record.mobile.stretch`) as the maps use it: the stretch when there is one, and the reason
 * to show when the report has two or more photos. Reports sent before the analysis existed have neither.
 */
export function readStretch(value: unknown, photoCount: number): { stretch: FloodStretch | null; placement: string | null } {
  const s = value && typeof value === "object" ? (value as Partial<Record<keyof StoredStretch, unknown>>) : null;
  if (!s) return { stretch: null, placement: null };
  const placement = photoCount > 1 && typeof s.reason === "string" ? s.reason : null;
  const line = Array.isArray(s.line) ? s.line.map(pair).filter((p): p is [number, number] => p !== null) : [];
  const mid = pair(s.mid);
  const ends = pair(s.ends);
  if (s.result !== "stretch" || line.length < 2 || !mid || !ends || typeof s.lengthM !== "number") return { stretch: null, placement };
  const roads = Array.isArray(s.roads) ? s.roads.filter((r): r is string => typeof r === "string") : [];
  return { stretch: { line, lengthM: s.lengthM, roads, mid, ends }, placement };
}
