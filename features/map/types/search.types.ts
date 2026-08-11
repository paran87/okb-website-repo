import type { LngLat } from "@/types/geo";

/** Search result categories. */
export type SearchCategory =
  | "road"
  | "barangay"
  | "city"
  | "coordinates"
  | "project"
  | "equipment"
  | "incident"
  | "sensor";

export interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  category: SearchCategory;
  coordinates: LngLat;
  score?: number;
}

export interface SearchOptions {
  query: string;
  categories?: readonly SearchCategory[];
  limit?: number;
}

/** Coordinate reference system identifiers (WGS84 default). */
export type CrsId = "EPSG:4326" | "EPSG:3857";

export interface FormattedCoordinates {
  lng: number;
  lat: number;
  crs: CrsId;
  dms?: string;
  decimal: string;
  mgrs?: string;
}

export interface CoordinateFormatOptions {
  precision?: number;
  crs?: CrsId;
  includeDms?: boolean;
}
