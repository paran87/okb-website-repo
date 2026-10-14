/** One waterway, drainage or ISF record (short keys as in the Apps Script dashboard). */
export interface AccomplishmentRecord {
  /** Name of the waterway. */
  n: string;
  /** Type column ("WATERWAY", "DRAINAGE", "ISF"). */
  t: string;
  /** Office. */
  o: string;
  /** Planned volume (m³). */
  p: number | null;
  /** Accomplished volume (m³). */
  v: number | null;
  /** Progress, on the dataset's [scale]. */
  g: number | null;
  /** Status ("COMPLETED", "ONGOING", "NOT YET STARTED"). */
  s: string;
  /** Planned length. */
  pl: number | null;
  /** Accomplished length. */
  al: number | null;
  /** Drainage record. */
  d: boolean;
  /** ISF record. */
  i: boolean;
  /** Accomplishment Log entries for this record (only on records the log knows). */
  lc?: number;
  /** Day of the last log entry ("2026-10-14", Manila). */
  lu?: string | null;
  /** Points cleaned / points total at the last log entry. */
  pc?: number | null;
  pt?: number | null;
  /** More about the record from the other SSOT tabs (public dashboard only). */
  x?: RecordExtra;
}

/** Details of a waterway from the other OKB SSOT tabs (keys short to keep the payload small). */
export interface RecordExtra {
  /** City / municipality (WaterwayVsCity). */
  city?: string;
  /** NCR quadrant: NORTH, SOUTH, EAST, WEST, CENTRAL (NCRWaterwayVsQuadrant). */
  q?: string;
  /** Sector and sector type (WaterwayVsSector): "DPWH" · "PUBLIC". */
  sec?: string;
  secT?: string;
  /** Target start and end dates, "2026-04-05" (WaterwayVsDates). */
  ts?: string;
  te?: string;
  /** Bottom-of-excavation width in metres (WaterwayVsWidth). */
  wd?: number;
  /** Original planned length (m) and volume (m³), before the office's own plan. */
  plo?: number;
  pvo?: number;
  /** Field photos (WaterwayvsPicture) and the newest one's Drive file id. */
  ph?: number;
  cv?: string;
  /** Traced points cleaned / total (WaterwayVsCoordinates). */
  cp?: number;
  tp?: number;
  /** Times the traced line was extended, and the day it was first registered (SitevsWaterway). */
  ext?: number;
  fr?: string;
}

export interface AccomplishmentSite {
  n: string;
  w: AccomplishmentRecord[];
}

export interface AccomplishmentRegion {
  /** Region abbreviation ("NCR", "IV-A"). */
  a: string;
  /** Region name. */
  n: string;
  s: AccomplishmentSite[];
}

export interface AccomplishmentData {
  /** When the data was read from the sheet (ISO). */
  generatedAt: string;
  /** Progress values are percents (12.5) or fractions (0.125). */
  scale: "percent" | "fraction";
  regions: AccomplishmentRegion[];
  stats: {
    regions: number;
    sites: number;
    waterways: number;
    drainages: number;
    isf: number;
    noAccomplishmentRow: number;
  };
  /** The Accomplishment Log replay: its total wins over WaterwayVsAccomplishment where it has entries. */
  log?: { present: boolean; rows: number; waterways: number; applied: number; logOnly: number };
}

/** A tab as rows of cells, the first row being the headings. */
export type SheetRows = string[][];
