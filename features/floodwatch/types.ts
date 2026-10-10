export interface FloodwatchCount {
  label: string;
  count: number;
}

/** Summary from the Floodwatch dashboard (the Flood Prone Areas tab). */
export interface FloodwatchSummary {
  totalAreas: number;
  byRegion: FloodwatchCount[];
  byProvince: FloodwatchCount[];
  pendingLocationReviews: number;
  openReports: number;
}

/** One row of the Flood Prone Areas tab (Floodwatch), with its position when Floodwatch has one. */
export interface FloodwatchArea {
  id: string;
  /** Road or waterway name ("España Blvd.", "Buendia Extension (S03216LZ)"). */
  road: string;
  /** KM / station / limits ("Antipolo St. to A. Maceda St.", "Corner Tayuman St."). */
  limits: string;
  barangay: string;
  municipality: string;
  province: string;
  region: string;
  deo: string;
  latitude: number | null;
  longitude: number | null;
  /** The position is a city, province or region centre rather than the place itself. */
  approximate: boolean;
  needsReview: boolean;
}
