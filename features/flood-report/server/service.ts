import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { deleteObject, getOperationsR2Config, objectExists, putObject, R2Error } from "@/features/operations/server/r2";
import { invalidateAggregates } from "@/features/reports/server/service";
import { getReportsConfig } from "@/features/reports/server/config";
import { MOBILE_REPORT_PLATFORM } from "@/features/reports/types";
import { FLOOD_LEVELS, inPhilippines, MAX_PHOTO_BYTES, MAX_PHOTOS, ROAD_STATUSES, WEATHER } from "@/features/flood-report/lib/options";
import { floodMapWeather } from "@/features/incident/server/flood-map";
import { buildMobileRecord, depthOf, toMyReport, toPublicReport } from "@/features/flood-report/server/record";
import type {
  FloodReportInput,
  MyFloodReport,
  PlaceName,
  PublicFloodReport,
  PublicFloodReportList,
  SubmittedReport,
} from "@/features/flood-report/types";

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

/** Checks that apply to a new report and to every edit of one. */
function checkReport(input: Omit<FloodReportInput, "id">, id: string, reportedAt: number) {
  if (!inPhilippines(input.latitude, input.longitude)) {
    throw new ValidationError("This service accepts flood reports from the Philippines only.");
  }
  const now = Date.now();
  const started = Date.parse(input.startedAt);
  if (started > now + 10 * 60_000) throw new ValidationError("The flood start time is in the future.");
  if (started < reportedAt - 7 * 24 * 3_600_000) throw new ValidationError("Only floods from the last 7 days can be reported.");
  if (input.recededAt) {
    const receded = Date.parse(input.recededAt);
    if (receded > now + 10 * 60_000) throw new ValidationError("The time the flood receded is in the future.");
    if (receded < started) throw new ValidationError("The flood cannot recede before it started.");
  }
  for (const photo of input.photos) {
    if (!photo.key.includes(`/${id}/`)) throw new ValidationError("A photo does not belong to this report.");
  }
  if (new Set(input.photos.map((p) => p.key)).size !== input.photos.length) throw new ValidationError("A photo was sent twice.");
}

// ---------------------------------------------------------------------------
// The bridge's automated WhatsApp report (TEXT / PDF) includes a mobile report only when it is marked
// record.mobile.inConsolidated. OKB_MOBILE_REPORT_TEST_IPS lists the addresses whose reports are marked while
// this is tested ("all" marks every report). Unset: none are marked.
// ---------------------------------------------------------------------------

function testIps(): { all: boolean; ips: Set<string> } {
  const raw = (process.env.OKB_MOBILE_REPORT_TEST_IPS ?? "").trim();
  const list = raw.split(/[\s,]+/).map((v) => v.trim().toLowerCase()).filter(Boolean);
  return { all: list.includes("all") || list.includes("*"), ips: new Set(list) };
}

/** Whether reports sent from this address go into the automated WhatsApp report. */
export function includedInConsolidated(ip: string): boolean {
  const { all, ips } = testIps();
  return all || ips.has(ip.trim().toLowerCase());
}

/** What /api/flood-reports/whoami shows: the caller's address and whether its reports are included. */
export function whoAmI(ip: string) {
  const { all, ips } = testIps();
  return { ip, includedInConsolidated: includedInConsolidated(ip), mode: all ? "all" : ips.size ? "test-addresses" : "off" };
}

// ---------------------------------------------------------------------------
// Sender's edit key: a random secret returned once when the report is sent and kept on the sender's phone.
// Only its SHA-256 is stored (record.mobile.ownerTokenHash), so nobody can read it back from the database.
// ---------------------------------------------------------------------------

const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function ownsReport(record: unknown, token: string): boolean {
  const mobile = (record as { mobile?: { ownerTokenHash?: unknown } } | null)?.mobile;
  const stored = typeof mobile?.ownerTokenHash === "string" ? mobile.ownerTokenHash : null;
  if (!stored || !TOKEN.test(token)) return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function submitReport(body: unknown, ip = ""): Promise<SubmittedReport> {
  const input = inputSchema.parse(body) as FloodReportInput;
  if (input.website) throw new BadRequestError("Report rejected.");
  const id = input.id.toLowerCase();
  checkReport(input, id, Date.now());

  const db = supabase();
  if (!db) throw new StorageUnavailable("Report storage is not configured on the server.");
  const cfg = r2();
  const present = await Promise.all(input.photos.map((p) => objectExists(cfg, p.key).catch(() => false)));
  if (present.some((ok) => !ok)) throw new ValidationError("A photo did not finish uploading. Please send again.");

  const editToken = randomBytes(32).toString("base64url");
  const built = buildMobileRecord({ ...input, id });
  const inConsolidated = includedInConsolidated(ip);
  const record = { ...built, mobile: { ...built.mobile, ownerTokenHash: hashToken(editToken), inConsolidated } };
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
  const liveRain = (await floodMapWeather().catch(() => null))?.state === "wet";
  const view = toPublicReport({ id, status: record.status, created_at: record.createdAt, record }, liveRain);
  if (!view) throw new StorageUnavailable("The report was saved but could not be shown.");
  return { report: view, editToken, inConsolidated };
}

// ---------------------------------------------------------------------------
// The sender's own reports: list, edit, delete (each checked against the edit key)
// ---------------------------------------------------------------------------

type Row = { id: string; status: string | null; created_at: string; record: Record<string, unknown> };

async function rest(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<Response> {
  const db = supabase();
  if (!db) throw new StorageUnavailable("Report storage is not configured on the server.");
  try {
    return await fetch(`${db.url}/rest/v1/${path}`, {
      method: init.method ?? "GET",
      headers: {
        apikey: db.key,
        Authorization: `Bearer ${db.key}`,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    log.error({ err }, "Flood report storage request failed (network)");
    throw new StorageUnavailable("The report storage could not be reached. Please try again.");
  }
}

async function rows(ids: string[]): Promise<Row[]> {
  const res = await rest(
    `${REPORTS}?select=id,status,created_at,record&platform=eq.${MOBILE_REPORT_PLATFORM}&id=in.(${ids.join(",")})&limit=${ids.length}`,
  );
  if (!res.ok) {
    log.error({ status: res.status }, "Own flood reports read rejected");
    throw new StorageUnavailable("Your reports could not be loaded.");
  }
  return (await res.json()) as Row[];
}

async function ownRow(id: string, token: unknown): Promise<Row> {
  if (!UUID.test(id) || typeof token !== "string") throw new NotFoundError("Report not found.");
  const row = (await rows([id.toLowerCase()]))[0];
  if (!row) throw new NotFoundError("This report no longer exists.");
  if (!ownsReport(row.record, token)) throw new ForbiddenError("This report can only be changed from the phone it was sent from.");
  return row;
}

const liveRainNow = async () => (await floodMapWeather().catch(() => null))?.state === "wet";

/** The reports sent from this phone (any status, so a rejected one is explained), newest first. */
export async function listMyReports(body: unknown): Promise<MyFloodReport[]> {
  const items = z
    .array(z.object({ id: z.string().regex(UUID), token: z.string().regex(TOKEN) }))
    .max(50)
    .parse((body as { items?: unknown } | null)?.items ?? []);
  if (!items.length || !supabase()) return [];
  const tokens = new Map(items.map((i) => [i.id.toLowerCase(), i.token]));
  const found = await rows([...tokens.keys()]);
  const liveRain = await liveRainNow();
  return found
    .filter((r) => ownsReport(r.record, tokens.get(r.id) ?? ""))
    .map((r) => toMyReport(r, liveRain))
    .filter((r): r is MyFloodReport => r !== null)
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

const editSchema = inputSchema.omit({ id: true, website: true }).extend({ token: z.string() });

/**
 * Replaces the sender's report with the edited form (and photo list). Photos left out are deleted from R2.
 * An approved report goes back to "needs review" unless the only change is the time the flood receded.
 */
export async function updateMyReport(id: string, body: unknown): Promise<MyFloodReport> {
  const { token, ...input } = editSchema.parse(body) as Omit<FloodReportInput, "id"> & { token: string };
  const row = await ownRow(id, token);
  const reportId = row.id;
  const status = row.status ?? "needs_review";
  if (status === "rejected" || status === "ignored") {
    throw new ForbiddenError("OKB operators took this report off the map, so it can no longer be edited. You can still delete it.");
  }
  checkReport(input, reportId, Date.parse(row.created_at));

  const old = (row.record.mobile ?? {}) as Record<string, unknown>;
  const oldKeys = new Set(Array.isArray(old.photos) ? old.photos.map((p) => (p as { key?: string }).key).filter(Boolean) : []);
  const added = input.photos.filter((p) => !oldKeys.has(p.key));
  const cfg = r2();
  const present = await Promise.all(added.map((p) => objectExists(cfg, p.key).catch(() => false)));
  if (present.some((ok) => !ok)) throw new ValidationError("A new photo did not finish uploading. Please try again.");

  // Only the receded time changed: no need for operators to verify the report again.
  const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
  const fields = ["level", "roadStatus", "weather", "startedAt", "locationText", "landmark", "remarks", "senderName", "contactNumber"] as const;
  const recededOnly =
    fields.every((f) => same(old[f], input[f])) &&
    same(old.depthM, depthOf(input)) &&
    added.length === 0 &&
    input.photos.length === oldKeys.size &&
    !same(old.recededAt, input.recededAt);
  const nextStatus = status === "approved" && !recededOnly ? "needs_review" : status;

  const createdAt = new Date(row.created_at);
  const rebuilt = buildMobileRecord({ ...input, id: reportId }, createdAt);
  const at = new Date().toISOString();
  const review = (row.record.review ?? {}) as { linkedMessageIds?: unknown; history?: unknown };
  const history = Array.isArray(review.history) ? review.history : [];
  const entry = {
    action: recededOnly ? "marked receded" : "edited",
    at,
    reviewer: "the sender (OKB Mobile)",
    notes: nextStatus !== status ? "Edited after approval; needs review again." : null,
  };
  const record = {
    ...rebuilt,
    status: nextStatus,
    updatedAt: at,
    review: { linkedMessageIds: [], ...review, history: [...history, entry].slice(-20) },
    mobile: { ...rebuilt.mobile, ownerTokenHash: old.ownerTokenHash, inConsolidated: old.inConsolidated === true, editedAt: at },
  };
  const res = await rest(`${REPORTS}?id=eq.${reportId}&platform=eq.${MOBILE_REPORT_PLATFORM}`, {
    method: "PATCH",
    body: { status: nextStatus, ai_summary: record.summary, updated_at: at, record },
    prefer: "return=minimal",
  });
  if (!res.ok) {
    log.error({ status: res.status }, "Flood report edit rejected");
    throw new StorageUnavailable("Your changes could not be saved. Please try again.");
  }
  const kept = new Set(input.photos.map((p) => p.key));
  const removed = [...oldKeys].filter((k): k is string => typeof k === "string" && !kept.has(k));
  await Promise.all(removed.map((k) => deleteObject(cfg, k).catch((err) => log.warn({ err, key: k }, "Removed photo not deleted from R2"))));
  invalidateAggregates();
  memo = null;
  log.info({ id: reportId, recededOnly, removed: removed.length, added: added.length }, "Mobile flood report edited by sender");
  const view = toMyReport({ id: reportId, status: nextStatus, created_at: row.created_at, record }, await liveRainNow());
  if (!view) throw new StorageUnavailable("Your changes were saved but could not be shown.");
  return view;
}

/** Deletes a mobile report and its photos, unless OKB operators already made it part of an incident. */
async function removeReport(row: Row, by: string): Promise<void> {
  const linked = await rest(`okb_command_incidents?select=id&report_id=eq.${row.id}&limit=1`);
  if (linked.ok && ((await linked.json()) as unknown[]).length) {
    throw new ConflictError("OKB operators already made this report part of an incident, so it can no longer be deleted.");
  }
  const res = await rest(`${REPORTS}?id=eq.${row.id}&platform=eq.${MOBILE_REPORT_PLATFORM}`, { method: "DELETE", prefer: "return=minimal" });
  if (res.status === 409) {
    throw new ConflictError("OKB operators already made this report part of an incident, so it can no longer be deleted.");
  }
  if (!res.ok) {
    log.error({ status: res.status }, "Flood report delete rejected");
    throw new StorageUnavailable("The report could not be deleted. Please try again.");
  }
  const photos = Array.isArray((row.record.mobile as { photos?: unknown } | undefined)?.photos)
    ? ((row.record.mobile as { photos: { key?: unknown }[] }).photos.map((p) => p.key).filter((k): k is string => typeof k === "string" && PHOTO_KEY.test(k)))
    : [];
  const cfg = getOperationsR2Config();
  if (cfg) await Promise.all(photos.map((k) => deleteObject(cfg, k).catch((err) => log.warn({ err, key: k }, "Photo of deleted report not removed from R2"))));
  invalidateAggregates();
  memo = null;
  log.info({ id: row.id, photos: photos.length, by }, "Mobile flood report deleted");
}

/** The sender deletes their report (checked with its edit key). */
export async function deleteMyReport(id: string, body: unknown): Promise<void> {
  await removeReport(await ownRow(id, (body as { token?: unknown } | null)?.token), "sender");
}

/**
 * An OKB operator deletes a mobile report (spam, a duplicate, a test, or one sent before senders had edit keys).
 * WhatsApp/Viber reports are never deleted here: the bridge owns them.
 */
export async function deleteReportAsOperator(id: string, operator: string): Promise<void> {
  if (!UUID.test(id)) throw new NotFoundError("Report not found.");
  const row = (await rows([id.toLowerCase()]))[0];
  if (!row) throw new NotFoundError("Only reports sent from the OKB mobile page can be deleted here.");
  await removeReport(row, `operator ${operator}`.slice(0, 120));
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
  if (!db) return { generatedAt, hours, liveRain: false, reports: [], configured: false };
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
  const liveRain = (await floodMapWeather().catch(() => null))?.state === "wet";
  const data = {
    generatedAt,
    hours,
    liveRain,
    reports: rows.map((row) => toPublicReport(row, liveRain)).filter((r): r is PublicFloodReport => r !== null),
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
