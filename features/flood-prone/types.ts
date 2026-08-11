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
