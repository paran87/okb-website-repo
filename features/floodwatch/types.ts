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
