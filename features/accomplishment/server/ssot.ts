import "server-only";
import { parseCsv } from "@/features/accomplishment/lib/csv";
import type { SheetRows } from "@/features/accomplishment/types";

/** OKB Single Source of Truth (SSOT v2), shared as "anyone with the link can view". */
export const SSOT_SHEET_ID = "16KfRxuSUFRJnW2qO5tL7ysYv_MiuZZDpA3IXD3k8gAU";
/** Each tab is read from Google at most this often (Next.js data cache). */
export const SSOT_REVALIDATE_SECONDS = 600;

/**
 * Tabs read by the dashboards (gid = the tab id in the sheet link). "Regions and Abbreviation" holds the region
 * passwords of the Apps Script sign-in, so only its first two columns are ever requested. The logs also hold
 * submitters' e-mail addresses: they are read whole (a column query can blank cells of mixed type), and only
 * named columns are picked from them on the server — e-mail addresses never reach a response.
 */
export const SSOT_TABS = {
  regions: 514202367, // Regions and Abbreviation (A, B only)
  siteRegion: 96462678, // SiteVsRegion
  siteWaterway: 222154877, // SitevsWaterway
  accomplishment: 1070697703, // WaterwayVsAccomplishment
  log: 2121090662, // Accomplishment Log (confirmation_email is never picked)
  updateLog: 111239110, // Accomplishment Update Log: site, date_of_update
  extensions: 302259682, // WaterwayExtensions (Submitter Email is never picked)
  pictures: 1755475585, // WaterwayvsPicture: name of waterway, link, date
  coordinates: 1075151418, // WaterwayVsCoordinates
  dates: 245415557, // WaterwayVsDates
  city: 1801395879, // WaterwayVsCity
  quadrant: 1109867439, // NCRWaterwayVsQuadrant
  sector: 839680129, // WaterwayVsSector
  length: 2049773714, // WaterwayVsLength
  width: 652488532, // WaterwayVsWidth
  volume: 1602477817, // WaterwayVsVolume
  siteEquipment: 1619917908, // SiteVsEquipment
  siteManpower: 1542259624, // SiteVsManpower
} as const;

async function fetchCsv(url: string): Promise<SheetRows> {
  const res = await fetch(url, { next: { revalidate: SSOT_REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`OKB SSOT sheet responded ${res.status}`);
  return parseCsv(await res.text());
}

/** A whole tab, as shown in the sheet. */
export const exportTab = (gid: number) =>
  fetchCsv(`https://docs.google.com/spreadsheets/d/${SSOT_SHEET_ID}/export?format=csv&gid=${gid}`);

/** Only the listed columns of a tab (Google Visualization query), for tabs that also hold private columns. */
export const queryTab = (gid: number, select: string) =>
  fetchCsv(
    `https://docs.google.com/spreadsheets/d/${SSOT_SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&gid=${gid}&tq=${encodeURIComponent(`select ${select}`)}`,
  );

/** A tab that may be missing or unreadable: empty instead of failing the whole dashboard. */
export const optionalTab = (load: Promise<SheetRows>) => load.catch((): SheetRows => []);

/** Region and Region Abbreviation only (never the password column). */
export const regionNames = () => queryTab(SSOT_TABS.regions, "A, B");
