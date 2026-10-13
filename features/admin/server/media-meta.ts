import "server-only";
import { siteDbConfigured, siteRest } from "@/features/admin/server/supabase";
import { ApiError } from "@/lib/api/errors";

/**
 * Details the admin gives a photo or video (okb_site_media, keyed by its R2 object key): title, caption, the date it
 * was taken, the place and, for Command Center files, the coordinates. The date/place/coordinate columns come from a
 * later setup step, so reads fall back to title and caption only until it has been run.
 */

export interface MediaMeta {
  key: string;
  title: string | null;
  caption: string | null;
  takenAt: string | null;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MediaMetaFields {
  title?: string | null;
  caption?: string | null;
  takenAt?: string | null;
  place?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Row {
  key: string;
  title: string | null;
  caption: string | null;
  taken_at?: string | null;
  place?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const BASE_COLUMNS = "key,title,caption";
const ALL_COLUMNS = `${BASE_COLUMNS},taken_at,place,latitude,longitude`;

let extended: { ok: boolean; at: number } | null = null;

/** Whether the date/place/coordinate columns exist (re-checked every 30 s while they do not). */
export async function metaColumnsAvailable(): Promise<boolean> {
  if (!siteDbConfigured()) return false;
  if (extended && (extended.ok || Date.now() - extended.at < 30_000)) return extended.ok;
  let ok = true;
  try {
    await siteRest("okb_site_media?select=taken_at,place,latitude,longitude&limit=1");
  } catch {
    ok = false;
  }
  extended = { ok, at: Date.now() };
  return ok;
}

const toMeta = (r: Row): MediaMeta => ({
  key: r.key,
  title: r.title ?? null,
  caption: r.caption ?? null,
  takenAt: r.taken_at ?? null,
  place: r.place ?? null,
  latitude: r.latitude ?? null,
  longitude: r.longitude ?? null,
});

const CACHE_MS = 15_000;
const cache = new Map<string, { at: number; rows: Promise<Map<string, MediaMeta> | null> }>();

async function load(prefix: string): Promise<Map<string, MediaMeta> | null> {
  if (!siteDbConfigured()) return null;
  try {
    const columns = (await metaColumnsAvailable()) ? ALL_COLUMNS : BASE_COLUMNS;
    const params = new URLSearchParams({ select: columns, key: `like.${prefix.replace(/[*%]/g, "")}*` });
    const { data } = await siteRest<Row[]>(`okb_site_media?${params}`);
    return new Map((data ?? []).map((r) => [r.key, toMeta(r)]));
  } catch {
    return null;
  }
}

/** The details of every file under a folder (shared for a few seconds); null when the table cannot be read. */
export function metaUnder(prefix: string): Promise<Map<string, MediaMeta> | null> {
  const hit = cache.get(prefix);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  const rows = load(prefix);
  cache.set(prefix, { at: Date.now(), rows });
  return rows;
}

export function invalidateMeta(prefix?: string): void {
  if (prefix) cache.delete(prefix);
  else cache.clear();
}

/** Saves the given fields (others stay as they are). A row with nothing left in it is removed. */
export async function saveMeta(key: string, fields: MediaMetaFields, by: string): Promise<void> {
  const wantsExtended =
    fields.takenAt !== undefined || fields.place !== undefined || fields.latitude !== undefined || fields.longitude !== undefined;
  const hasExtended = await metaColumnsAvailable();
  if (wantsExtended && !hasExtended) {
    const anySet = [fields.takenAt, fields.place, fields.latitude, fields.longitude].some((v) => v !== null && v !== undefined);
    if (anySet) {
      throw new ApiError(
        503,
        "INTERNAL_ERROR",
        "Dates, places and coordinates need one more setup step. Open Admin → Setup and run the SQL again.",
        { reason: "meta_columns_missing" },
      );
    }
  }
  const body: Record<string, unknown> = { key, updated_by: by, updated_at: new Date().toISOString() };
  if (fields.title !== undefined) body.title = fields.title;
  if (fields.caption !== undefined) body.caption = fields.caption;
  if (hasExtended) {
    if (fields.takenAt !== undefined) body.taken_at = fields.takenAt;
    if (fields.place !== undefined) body.place = fields.place;
    if (fields.latitude !== undefined) body.latitude = fields.latitude;
    if (fields.longitude !== undefined) body.longitude = fields.longitude;
  }
  const everythingGiven =
    fields.title !== undefined && fields.caption !== undefined && (!hasExtended || (fields.takenAt !== undefined && fields.place !== undefined && fields.latitude !== undefined && fields.longitude !== undefined));
  const allEmpty = [fields.title, fields.caption, fields.takenAt, fields.place, fields.latitude, fields.longitude].every(
    (v) => v === null || v === undefined,
  );
  if (everythingGiven && allEmpty) {
    await siteRest(`okb_site_media?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", prefer: ["return=minimal"] });
  } else {
    await siteRest("okb_site_media?on_conflict=key", {
      method: "POST",
      body,
      prefer: ["resolution=merge-duplicates", "return=minimal"],
    });
  }
  invalidateMeta();
}

export async function moveMeta(from: string, to: string): Promise<void> {
  if (!siteDbConfigured()) return;
  try {
    await siteRest(`okb_site_media?key=eq.${encodeURIComponent(from)}`, {
      method: "PATCH",
      body: { key: to, updated_at: new Date().toISOString() },
      prefer: ["return=minimal"],
    });
    invalidateMeta();
  } catch {
    /* details are optional */
  }
}

export async function deleteMeta(key: string): Promise<void> {
  if (!siteDbConfigured()) return;
  await siteRest(`okb_site_media?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", prefer: ["return=minimal"] }).catch(
    () => undefined,
  );
  invalidateMeta();
}
