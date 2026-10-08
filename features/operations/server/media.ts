import "server-only";
import curated from "@/lib/config/operations-media.json";
import {
  operationsSection,
  type OperationsMediaKind,
  type OperationsSectionId,
} from "@/features/operations/config";
import type { OperationsMediaItem, OperationsMediaList } from "@/features/operations/types";
import {
  getOperationsR2Config,
  listObjects,
  moveObject,
  presign,
  type R2Config,
  type R2Object,
} from "@/features/operations/server/r2";

/**
 * Operations galleries show only the files listed in
 * lib/config/operations-media.json, checked by hand:
 *  - Photos: geotagged ones (a GPS map stamp on the photo, or GPS in its EXIF),
 *    with the position read from the stamp (or, when the stamp prints only an
 *    address, looked up from that address and marked approximate).
 *  - Videos: ones showing declogging / clearing / cleaning work.
 * Files are also listed from the bucket, so a deleted or missing file is not
 * shown. Deleting moves the file to the bucket's TRASH_PREFIX folder, so it
 * can be restored from the Cloudflare dashboard.
 */

export const TRASH_PREFIX = "_deleted/";
const LINK_TTL_S = 6 * 60 * 60;

interface CuratedEntry {
  key: string;
  lat?: number;
  lng?: number;
  place?: string;
  /** Located from the stamp's printed address (the stamp shows no coordinates). */
  approx?: boolean;
  note?: string;
}

const CURATED = curated as Record<OperationsSectionId, Record<OperationsMediaKind, CuratedEntry[]>>;

function toItem(cfg: R2Config, obj: R2Object, kind: OperationsMediaKind, entry: CuratedEntry): OperationsMediaItem {
  return {
    key: obj.key,
    name: obj.key.split("/").pop() || obj.key,
    kind: kind === "photos" ? "photo" : "video",
    url: presign(cfg, "GET", obj.key, { expiresIn: LINK_TTL_S }),
    size: obj.size,
    lastModified: obj.lastModified,
    geotag:
      entry.lat !== undefined && entry.lng !== undefined
        ? { lat: entry.lat, lng: entry.lng, approx: entry.approx === true }
        : null,
    place: entry.place ?? null,
    note: entry.note ?? null,
  };
}

export async function listOperationsMedia(
  section: OperationsSectionId,
  kind: OperationsMediaKind,
): Promise<OperationsMediaList> {
  const cfg = getOperationsR2Config();
  const { prefix } = operationsSection(section);
  if (!cfg || !prefix) return { section, kind, configured: Boolean(cfg), items: [] };

  const curatedByKey = new Map(CURATED[section][kind].map((e) => [e.key, e]));
  const items = (await listObjects(cfg, prefix)).flatMap((obj) => {
    const entry = curatedByKey.get(obj.key);
    return entry && obj.size > 0 ? [toItem(cfg, obj, kind, entry)] : [];
  });
  items.sort((a, b) => b.lastModified.localeCompare(a.lastModified) || a.key.localeCompare(b.key));
  return { section, kind, configured: true, items };
}

/** Moves a file of the section to the trash folder. Returns false if the key is not in the section. */
export async function deleteOperationsMedia(section: OperationsSectionId, key: string): Promise<boolean> {
  const cfg = getOperationsR2Config();
  const { prefix } = operationsSection(section);
  if (!cfg || !prefix || !key.startsWith(prefix) || key.includes("..")) return false;
  await moveObject(cfg, key, `${TRASH_PREFIX}${key}`);
  return true;
}
