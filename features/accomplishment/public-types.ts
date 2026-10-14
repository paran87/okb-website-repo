import type { AccomplishmentData } from "@/features/accomplishment/types";

/** A field photo (WaterwayvsPicture), newest first. */
export interface FieldPhoto {
  /** Google Drive file id (served by lh3.googleusercontent.com/d/<id>). */
  id: string;
  /** Waterway name as in the dashboard. */
  w: string;
  /** Region code ("NCR", "Region VI") and site. */
  r: string;
  s: string;
  /** Day taken / filed, "2026-06-26". */
  d: string | null;
}

/** One entry of the Accomplishment Log (no submitter details). */
export interface FieldUpdate {
  at: string | null;
  waterway: string;
  region: string;
  site: string;
  type: string;
  mode: "to" | "by";
  volume: number | null;
  total: number | null;
  previous: number | null;
  planned: number | null;
  pointsCleaned: number | null;
  pointsTotal: number | null;
  segmentsCleaned: number | null;
  segmentsTotal: number | null;
}

/** A traced line added to a waterway (WaterwayExtensions, no submitter details). */
export interface LineExtension {
  at: string | null;
  region: string;
  site: string;
  waterway: string;
  no: number | null;
  points: number | null;
  segments: number | null;
}

export interface Quantity {
  label: string;
  qty: number;
}

export interface SiteResources {
  site: string;
  region: string;
  equipment: number;
  manpower: number;
  items: { type: string; source: string; qty: number }[];
  crew: { source: string; qty: number }[];
}

/** Everything the public Accomplishment dashboard shows (no private columns). */
export interface PublicAccomplishment extends AccomplishmentData {
  /** Last report day per site (Accomplishment Update Log). */
  siteReports: { site: string; region: string; date: string | null }[];
  resources: {
    equipment: number;
    manpower: number;
    equipmentByType: Quantity[];
    equipmentBySource: Quantity[];
    manpowerBySource: Quantity[];
    sites: SiteResources[];
  };
  updates: FieldUpdate[];
  extensions: LineExtension[];
  photos: { total: number; waterways: number; first: string | null; last: string | null; latest: FieldPhoto[] };
  coordinates: { waterways: number; points: number; cleaned: number };
}

/** A waterway's traced line for the map: runs of cleaned (1) and remaining (0) stretches. */
export interface MapLine {
  /** Waterway name, region code, site, progress (%). */
  w: string;
  r: string;
  s: string;
  g: number | null;
  /** [cleaned, lng, lat, lng, lat, …] per run. */
  runs: number[][];
}
