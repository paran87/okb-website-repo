import "server-only";
import { buildAccomplishment, type AccomplishmentTabs } from "@/features/accomplishment/lib/build";
import { exportTab, optionalTab, regionNames, SSOT_TABS } from "@/features/accomplishment/server/ssot";
import type { AccomplishmentData } from "@/features/accomplishment/types";

/** The tabs the progress dashboard needs (cached for 10 minutes). */
export async function loadAccomplishmentTabs(): Promise<AccomplishmentTabs> {
  const [regions, siteRegion, siteWaterway, accomplishment, log] = await Promise.all([
    regionNames(),
    exportTab(SSOT_TABS.siteRegion),
    exportTab(SSOT_TABS.siteWaterway),
    exportTab(SSOT_TABS.accomplishment),
    optionalTab(exportTab(SSOT_TABS.log)),
  ]);
  return { regions, siteRegion, siteWaterway, accomplishment, log };
}

/** Accomplishment of every region, site and waterway (cached for 10 minutes). */
export async function getAccomplishment(): Promise<AccomplishmentData> {
  return buildAccomplishment(await loadAccomplishmentTabs());
}
