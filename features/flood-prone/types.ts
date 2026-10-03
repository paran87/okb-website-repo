/** Parsed DEOS flood-prone road section from the 2026 document. */
export interface DeosFloodProneArea {
  id: string;
  deo: string;
  index: number;
  description: string;
}

/** GeoJSON point feature properties for a flood-prone area marker. */
export interface FloodProneAreaProperties {
  id: string;
  title: string;
  description: string;
  deo: string;
  index: number;
  category: "flood-prone";
  geocodeMethod?: "nominatim" | "centroid";
}

/** Table row for the NCR Critical Areas view, derived from a DEOS area. */
export interface NcrCriticalAreaRecord {
  id: string;
  index: number;
  deo: string;
  region: string;
  province: string;
  municipality: string;
  /** Barangay or landmark detail pulled from the description. */
  location: string;
  road: string;
  description: string;
  longitude: number | null;
  latitude: number | null;
  /** "located" markers came from a road lookup; "review" ones are approximate. */
  status: "located" | "review";
}
