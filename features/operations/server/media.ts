import "server-only";
import curated from "@/lib/config/operations-media.json";
import {
  operationsSection,
  type OperationsMediaKind,
  type OperationsSectionId,
} from "@/features/operations/config";
import type { OperationsMediaItem, OperationsMediaList } from "@/features/operations/types";
import { exifGps } from "@/features/operations/server/exif-gps";
import {
  getOperationsR2Config,
  listObjects,
  moveObject,
  presign,
  readStart,
  type R2Config,
  type R2Object,
} from "@/features/operations/server/r2";

/**
 * Operations galleries follow the R2 bucket: every request lists the section's folder, so files added or deleted
 * in the bucket (also from the Cloudflare dashboard) appear or disappear on the next refresh.
 *
 * The files that were in the bucket when the galleries were set up were checked by hand
 * (lib/config/operations-media.json, as of CURATED_AT): of those, only
 *  - Photos: geotagged ones (a GPS map stamp on the photo, or GPS in its EXIF),
 *    with the position read from the stamp (or, when the stamp prints only an
 *    address, looked up from that address and marked approximate), and
 *  - Videos: ones showing declogging / clearing / cleaning work
 * are shown. Files added after CURATED_AT are shown automatically (photos and videos by file type); a new photo is
 * placed on the map from the GPS in its EXIF when it has one.
 * Deleting moves the file to the bucket's TRASH_PREFIX folder, so it can be restored from the Cloudflare dashboard.
 */

export const TRASH_PREFIX = "_deleted/";
const LINK_TTL_S = 6 * 60 * 60;
/** When the bucket was listed for operations-media.json; files modified later were not reviewed and are shown. */
const CURATED_AT = Date.parse("2026-10-08T07:54:00Z");
const FILE_TYPES: Record<OperationsMediaKind, RegExp> = {
  photos: /\.(jpe?g|png|webp|gif)$/i,
  videos: /\.(mp4|m4v|mov|webm|3gp)$/i,
};
/** Listings are shared for a few seconds, so many open galleries refreshing do not each list the bucket. */
const LIST_TTL_MS = 15_000;
const HOUR_MS = 60 * 60 * 1000;
/** EXIF sits at the start of a JPEG; this much is read from a new photo, once. */
const EXIF_BYTES = 128 * 1024;
const EXIF_PER_REQUEST = 24;

const listings = new Map<string, { at: number; objects: Promise<R2Object[]> }>();
/** EXIF position of new photos by key + ETag (null: none); kept for the life of the server instance. */
const exifCache = new Map<string, { lat: number; lng: number } | null>();

function listCached(cfg: R2Config, prefix: string): Promise<R2Object[]> {
  const hit = listings.get(prefix);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.objects;
  const objects = listObjects(cfg, prefix);
  listings.set(prefix, { at: Date.now(), objects });
  objects.catch(() => listings.delete(prefix));
  return objects;
}

/** Reads the EXIF position of new photos not seen yet (a few per request; the rest on the next refresh). */
async function readExif(cfg: R2Config, objects: R2Object[]): Promise<void> {
  const todo = objects.filter((o) => /\.jpe?g$/i.test(o.key) && !exifCache.has(`${o.key}|${o.etag}`));
  await Promise.all(
    todo.slice(0, EXIF_PER_REQUEST).map(async (o) => {
      try {
        exifCache.set(`${o.key}|${o.etag}`, exifGps(await readStart(cfg, o.key, EXIF_BYTES)));
      } catch {
        /* tried again on the next refresh */
      }
    }),
  );
}

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

function toItem(
  cfg: R2Config,
  obj: R2Object,
  kind: OperationsMediaKind,
  entry: CuratedEntry,
  signedAt: Date,
): OperationsMediaItem {
  return {
    key: obj.key,
    name: obj.key.split("/").pop() || obj.key,
    kind: kind === "photos" ? "photo" : "video",
    // Signed at the start of the hour: the same link for an hour, valid for at least LINK_TTL_S.
    url: presign(cfg, "GET", obj.key, { expiresIn: LINK_TTL_S + 3600, at: signedAt }),
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
  const objects = (await listCached(cfg, prefix)).filter((o) => o.size > 0);
  const added = objects.filter(
    (o) => !curatedByKey.has(o.key) && Date.parse(o.lastModified) > CURATED_AT && FILE_TYPES[kind].test(o.key),
  );
  if (kind === "photos") await readExif(cfg, added);
  const addedKeys = new Set(added.map((o) => o.key));
  const signedAt = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);
  const items = objects.flatMap((obj) => {
    const entry = curatedByKey.get(obj.key);
    if (entry) return [toItem(cfg, obj, kind, entry, signedAt)];
    if (!addedKeys.has(obj.key)) return [];
    const gps = exifCache.get(`${obj.key}|${obj.etag}`);
    return [toItem(cfg, obj, kind, gps ? { key: obj.key, ...gps } : { key: obj.key }, signedAt)];
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
  listings.delete(prefix);
  return true;
}
