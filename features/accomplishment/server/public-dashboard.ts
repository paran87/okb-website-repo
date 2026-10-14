import "server-only";
import {
  buildFieldPhotos,
  buildMapLines,
  buildPublicAccomplishment,
  type PublicTabs,
} from "@/features/accomplishment/lib/public-build";
import { loadAccomplishmentTabs } from "@/features/accomplishment/server/accomplishment.service";
import { exportTab, optionalTab, SSOT_TABS } from "@/features/accomplishment/server/ssot";
import type { FieldPhoto, MapLine, PublicAccomplishment } from "@/features/accomplishment/public-types";

/** The detail tabs (each optional: a missing tab leaves its part of the dashboard empty). */
async function loadDetailTabs(): Promise<Omit<PublicTabs, keyof Awaited<ReturnType<typeof loadAccomplishmentTabs>>>> {
  const tab = (gid: number) => optionalTab(exportTab(gid));
  const [updateLog, extensions, pictures, dates, city, quadrant, sector, length, width, volume, siteEquipment, siteManpower] =
    await Promise.all([
      tab(SSOT_TABS.updateLog),
      tab(SSOT_TABS.extensions),
      tab(SSOT_TABS.pictures),
      tab(SSOT_TABS.dates),
      tab(SSOT_TABS.city),
      tab(SSOT_TABS.quadrant),
      tab(SSOT_TABS.sector),
      tab(SSOT_TABS.length),
      tab(SSOT_TABS.width),
      tab(SSOT_TABS.volume),
      tab(SSOT_TABS.siteEquipment),
      tab(SSOT_TABS.siteManpower),
    ]);
  return { updateLog, extensions, pictures, dates, city, quadrant, sector, length, width, volume, siteEquipment, siteManpower };
}

/** Everything the public Accomplishment dashboard shows (sheet tabs cached for 10 minutes). */
export async function getPublicAccomplishment(): Promise<PublicAccomplishment> {
  const [base, details, coordinates] = await Promise.all([
    loadAccomplishmentTabs(),
    loadDetailTabs(),
    optionalTab(exportTab(SSOT_TABS.coordinates)),
  ]);
  return buildPublicAccomplishment({ ...base, ...details, coordinates });
}

/** Every field photo, newest first. */
export async function getFieldPhotos(): Promise<FieldPhoto[]> {
  const [base, pictures] = await Promise.all([loadAccomplishmentTabs(), optionalTab(exportTab(SSOT_TABS.pictures))]);
  return buildFieldPhotos({ ...base, pictures });
}

/** Every traced waterway line, as cleaned and remaining runs. */
export async function getMapLines(): Promise<MapLine[]> {
  const [base, coordinates] = await Promise.all([loadAccomplishmentTabs(), optionalTab(exportTab(SSOT_TABS.coordinates))]);
  return buildMapLines({ ...base, coordinates });
}
