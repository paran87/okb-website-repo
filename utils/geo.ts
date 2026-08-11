import type { LngLat, BoundingBox } from "@/types/geo";
import type { Point } from "geojson";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points in kilometers (Haversine). */
export function haversineDistanceKm(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Validate a [lng, lat] tuple is within valid geographic bounds. */
export function isValidLngLat([lng, lat]: LngLat): boolean {
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

/** Compute the bounding box that encloses a set of coordinates. */
export function boundsFromCoordinates(
  coordinates: readonly LngLat[],
): BoundingBox | null {
  if (coordinates.length === 0) return null;
  return coordinates.reduce<BoundingBox>(
    (acc, [lng, lat]) => ({
      minLng: Math.min(acc.minLng, lng),
      minLat: Math.min(acc.minLat, lat),
      maxLng: Math.max(acc.maxLng, lng),
      maxLat: Math.max(acc.maxLat, lat),
    }),
    {
      minLng: Infinity,
      minLat: Infinity,
      maxLng: -Infinity,
      maxLat: -Infinity,
    },
  );
}

/** Build a GeoJSON Point from a coordinate tuple. */
export function toGeoJSONPoint([lng, lat]: LngLat): Point {
  return { type: "Point", coordinates: [lng, lat] };
}
