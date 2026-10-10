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
}

/** A tab as rows of cells, the first row being the headings. */
export type SheetRows = string[][];
