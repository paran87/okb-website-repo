import "server-only";
import { buildAccomplishment, type AccomplishmentTabs } from "@/features/accomplishment/lib/build";
import { parseCsv } from "@/features/accomplishment/lib/csv";
import type { AccomplishmentData, SheetRows } from "@/features/accomplishment/types";

/** OKB Single Source of Truth (SSOT v2), shared as "anyone with the link can view". */
const SSOT_SHEET_ID = "16KfRxuSUFRJnW2qO5tL7ysYv_MiuZZDpA3IXD3k8gAU";
const REVALIDATE_SECONDS = 600;

/** The tabs the dashboard reads (gid = the tab id in the sheet link). */
const TABS = {
  regions: 514202367, // Regions and Abbreviation
  siteRegion: 96462678, // SiteVsRegion
  siteWaterway: 222154877, // SitevsWaterway
  accomplishment: 1070697703, // WaterwayVsAccomplishment
} as const;

async function fetchCsv(url: string): Promise<SheetRows> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`OKB SSOT sheet responded ${res.status}`);
  return parseCsv(await res.text());
}

/** A whole tab, as shown in the sheet. */
const exportTab = (gid: number) =>
  fetchCsv(`https://docs.google.com/spreadsheets/d/${SSOT_SHEET_ID}/export?format=csv&gid=${gid}`);

/**
 * Only the Region and Region Abbreviation columns of the regions tab: the tab also holds the region passwords
 * of the Apps Script sign-in, which must never be read here.
 */
const regionNames = () =>
  fetchCsv(
    `https://docs.google.com/spreadsheets/d/${SSOT_SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&gid=${TABS.regions}&tq=${encodeURIComponent("select A, B")}`,
  );

/** Accomplishment of every region, site and waterway (cached for 10 minutes). */
export async function getAccomplishment(): Promise<AccomplishmentData> {
  const [regions, siteRegion, siteWaterway, accomplishment] = await Promise.all([
    regionNames(),
    exportTab(TABS.siteRegion),
    exportTab(TABS.siteWaterway),
    exportTab(TABS.accomplishment),
  ]);
  const tabs: AccomplishmentTabs = { regions, siteRegion, siteWaterway, accomplishment };
  return buildAccomplishment(tabs);
}
