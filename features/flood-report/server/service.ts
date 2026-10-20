import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ApiError, BadRequestError, ConflictError, ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getOperationsR2Config, objectExists, putObject, R2Error } from "@/features/operations/server/r2";
import { invalidateAggregates } from "@/features/reports/server/service";
import { getReportsConfig } from "@/features/reports/server/config";
import { MOBILE_REPORT_PLATFORM } from "@/features/reports/types";
import { FLOOD_LEVELS, inPhilippines, MAX_PHOTO_BYTES, MAX_PHOTOS, ROAD_STATUSES, WEATHER } from "@/features/flood-report/lib/options";
import { buildMobileRecord, toPublicReport } from "@/features/flood-report/server/record";
import type { FloodReportInput, PlaceName, PublicFloodReport, PublicFloodReportList } from "@/features/flood-report/types";

/**
 * Public flood reports from the mobile page.
 *
 *  - Photos go to the operations R2 bucket under `flood-reports/YYYY/MM/DD/<reportId>/` (server-side
 *    upload, one photo per request so each stays under Vercel's 4.5 MB request cap).
 *  - The report becomes an `okb_bridge_reports` row (platform `okb_mobile`, status "needs_review"), written
 *    with the service-role key. The bridge never overwrites rows it did not create.
 */

const log = logger.child({ module: "flood-report" });
const REPORTS = "okb_bridge_reports";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PHOTO_PREFIX = "flood-reports/";
export const PHOTO_KEY = /^flood-reports\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\/[0-9a-f]{16}\.jpg$/;

class StorageUnavailable extends ApiError {
  constructor(message: string) {
    super(503, "INTERNAL_ERROR", message, { reason: "storage_unavailable" });
  }
}

function supabase() {
  const cfg = getReportsConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) return null;
  return { url: cfg.supabaseUrl, key: cfg.supabaseServiceKey };
}

function r2() {
  const cfg = getOperationsR2Config();
  if (!cfg) throw new StorageUnavailable("Photo storage (Cloudflare R2) is not configured on the server.");
  return cfg;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

function manilaDayPath(now = new Date()): string {
  const d = new Date(now.getTime() + 8 * 3_600_000);
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Stores one JPEG for a report that is being written; returns its R2 key. */
export async function uploadPhoto(reportId: string, bytes: ArrayBuffer): Promise<string> {
  if (!UUID.test(reportId)) throw new BadRequestError("Invalid report id");
  if (bytes.byteLength === 0) throw new BadRequestError("The photo is empty.");
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new BadRequestError("The photo is too large.");
  const head = new Uint8Array(bytes, 0, 3);
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) throw new BadRequestError("Only JPEG photos are accepted.");
  const cfg = r2();
  const key = `${PHOTO_PREFIX}${manilaDayPath()}/${reportId.toLowerCase()}/${randomBytes(8).toString("hex")}.jpg`;
  try {
    await putObject(cfg, key, bytes, "image/jpeg");
  } catch (err) {
    log.error({ err: err instanceof R2Error ? { code: err.code, status: err.status } : err }, "Flood report photo upload failed");
    throw new StorageUnavailable("The photo could not be saved. Please try again.");
  }
  return key;
}

// ---------------------------------------------------------------------------
// Report submission
// ---------------------------------------------------------------------------

const isoTime = z
  .string()
  .max(40)
  .refine((v) => Number.isFinite(Date.parse(v)), "Invalid time");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v.replace(/\s+/g, " ") : null));

const inputSchema = z.object({
  id: z.string().regex(UUID, "Invalid report id"),
  photos: z
    .array(
      z.object({
        key: z.string().regex(PHOTO_KEY, "Invalid photo"),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracyM: z.number().min(0).max(100_000).nullable(),
        takenAt: isoTime,
      }),
    )
    .min(1, "Add at least one photo")
    .max(MAX_PHOTOS),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100_000).nullable(),
  locationText: z.string().trim().min(2, "Enter the street or place").max(200),
  landmark: optionalText(200),
  place: z
    .object({
      label: z.string().max(300),
      road: z.string().max(200).nullable(),
      barangay: z.string().max(200).nullable(),
      city: z.string().max(200).nullable(),
      province: z.string().max(200).nullable(),
      region: z.string().max(200).nullable(),
    })
    .nullable(),
  level: z.enum(FLOOD_LEVELS.map((l) => l.id) as [string, ...string[]]),
  depthCm: z.number().min(1).max(1000).nullable(),
  roadStatus: z.enum(ROAD_STATUSES.map((r) => r.id) as [string, ...string[]]),
  weather: z.enum(WEATHER.map((w) => w.id) as [string, ...string[]]),
  startedAt: isoTime,
  recededAt: isoTime.nullable(),
  remarks: optionalText(1000),
  senderName: optionalText(80),
  contactNumber: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\+?[0-9\s-]{7,20}$/.test(v), "Enter a valid mobile number"),
  website: z.string().max(200).optional(),
});

export async function submitReport(body: unknown): Promise<PublicFloodReport> {
  const input = inputSchema.parse(body) as FloodReportInput;
  if (input.website) throw new BadRequestError("Report rejected.");
  const id = input.id.toLowerCase();
  if (!inPhilippines(input.latitude, input.longitude)) {
    throw new ValidationError("This service accepts flood reports from the Philippines only.");
  }
  const now = Date.now();
  const started = Date.parse(input.startedAt);
  if (started > now + 10 * 60_000) throw new ValidationError("The flood start time is in the future.");
  if (started < now - 7 * 24 * 3_600_000) throw new ValidationError("Only floods from the last 7 days can be reported.");
  if (input.recededAt) {
    const receded = Date.parse(input.recededAt);
    if (receded > now + 10 * 60_000) throw new ValidationError("The time the flood receded is in the future.");
    if (receded < started) throw new ValidationError("The flood cannot recede before it started.");
  }
  for (const photo of input.photos) {
    if (!photo.key.includes(`/${id}/`)) throw new ValidationError("A photo does not belong to this report.");
  }
  if (new Set(input.photos.map((p) => p.key)).size !== input.photos.length) throw new ValidationError("A photo was sent twice.");

  const db = supabase();
  if (!db) throw new StorageUnavailable("Report storage is not configured on the server.");
  const cfg = r2();
  const present = await Promise.all(input.photos.map((p) => objectExists(cfg, p.key).catch(() => false)));
  if (present.some((ok) => !ok)) throw new ValidationError("A photo did not finish uploading. Please send again.");

  const record = buildMobileRecord({ ...input, id });
  const row = {
    id,
    message_id: id,
    platform: MOBILE_REPORT_PLATFORM,
    device_id: null,
    status: record.status,
    report_type: record.reportType,
    ai_summary: record.summary,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    record,
  };
  let res: Response;
  try {
    res = await fetch(`${db.url}/rest/v1/${REPORTS}`, {
      method: "POST",
      headers: {
        apikey: db.key,
        Authorization: `Bearer ${db.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    log.error({ err }, "Flood report insert failed (network)");
    throw new StorageUnavailable("The report could not be saved. Please try again.");
  }
  if (res.status === 409) throw new ConflictError("This report was already sent.");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    log.error({ status: res.status, detail: detail.slice(0, 300) }, "Flood report insert rejected");
    throw new StorageUnavailable("The report could not be saved. Please try again.");
  }
  invalidateAggregates();
  memo = null;
  log.info({ id, photos: input.photos.length }, "Mobile flood report saved");
  const view = toPublicReport({ id, status: record.status, created_at: record.createdAt, record });
  if (!view) throw new StorageUnavailable("The report was saved but could not be shown.");
  return view;
}

// ---------------------------------------------------------------------------
// Public map
// ---------------------------------------------------------------------------

export const MAP_HOURS = [6, 24, 72, 168] as const;
let memo: { at: number; hours: number; data: PublicFloodReportList } | null = null;

/** Mobile reports of the last [hours] for the public map (rejected reports are left out). 15-second memo. */
export async function listPublicReports(hours: number): Promise<PublicFloodReportList> {
  if (memo && memo.hours === hours && Date.now() - memo.at < 15_000) return memo.data;
  const db = supabase();
  const generatedAt = new Date().toISOString();
  if (!db) return { generatedAt, hours, reports: [], configured: false };
  const params = new URLSearchParams({
    select: "id,status,created_at,record",
    platform: `eq.${MOBILE_REPORT_PLATFORM}`,
    status: "in.(needs_review,extracted,approved)",
    created_at: `gte.${new Date(Date.now() - hours * 3_600_000).toISOString()}`,
    order: "created_at.desc",
    limit: "400",
  });
  let res: Response;
  try {
    res = await fetch(`${db.url}/rest/v1/${REPORTS}?${params.toString()}`, {
      headers: { apikey: db.key, Authorization: `Bearer ${db.key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    log.error({ err }, "Flood report list failed (network)");
    throw new StorageUnavailable("Flood reports could not be loaded.");
  }
  if (!res.ok) {
    log.error({ status: res.status }, "Flood report list rejected");
    throw new StorageUnavailable("Flood reports could not be loaded.");
  }
  const rows = (await res.json()) as { id: string; status: string | null; created_at: string; record: unknown }[];
  const data = {
    generatedAt,
    hours,
    reports: rows.map(toPublicReport).filter((r): r is PublicFloodReport => r !== null),
    configured: true,
  };
  memo = { at: Date.now(), hours, data };
  return data;
}

// ---------------------------------------------------------------------------
// Reverse geocoding (OpenStreetMap Nominatim, cached per ~10 m)
// ---------------------------------------------------------------------------

const places = new Map<string, PlaceName | null>();

export async function reverseGeocode(lat: number, lng: number, origin: string): Promise<PlaceName | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (places.has(cacheKey)) return places.get(cacheKey) ?? null;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "en",
  }).toString();
  let place: PlaceName | null = null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `OKB-Command-Center/1.0 (+${origin})`, Referer: origin },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const a = body.address ?? {};
    const road = a.road ?? a.pedestrian ?? a.footway ?? a.highway ?? a.street ?? null;
    const barangay = a.quarter ?? a.suburb ?? a.neighbourhood ?? a.village ?? a.hamlet ?? null;
    const city = a.city ?? a.town ?? a.municipality ?? a.city_district ?? null;
    const province = a.province ?? a.state_district ?? a.county ?? null;
    const region = a.region ?? a.state ?? null;
    const parts = [...new Set([road, barangay, city].filter((v): v is string => Boolean(v)))];
    const label = parts.join(", ") || (body.display_name ?? "").split(",").slice(0, 3).join(",").trim();
    place = label ? { label, road, barangay, city, province, region } : null;
  } catch {
    return null;
  }
  if (places.size > 2000) places.clear();
  places.set(cacheKey, place);
  return place;
}
