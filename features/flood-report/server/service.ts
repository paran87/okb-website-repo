import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { deleteObject, getOperationsR2Config, objectExists, presign, putObject, R2Error, r2Fetch } from "@/features/operations/server/r2";
import { invalidateAggregates } from "@/features/reports/server/service";
import { getReportsConfig } from "@/features/reports/server/config";
import { MOBILE_REPORT_PLATFORM } from "@/features/reports/types";
import {
  FLOOD_LEVELS,
  inPhilippines,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MAX_VIDEOS,
  ROAD_STATUSES,
  WEATHER,
} from "@/features/flood-report/lib/options";
import { floodMapWeather } from "@/features/incident/server/flood-map";
import { bridgePins, bridgeReportsForAdmin } from "@/features/flood-report/server/bridge-reports";
import { deleteAllMedia, NO_MEDIA, reportMediaIndex } from "@/features/flood-report/server/media";
import { buildMobileRecord, depthOf, toMyReport, toPublicReport } from "@/features/flood-report/server/record";
import { analyzeStretch } from "@/features/flood-report/server/stretch";
import type { StoredStretch } from "@/features/flood-report/lib/stretch";
import type {
  AdminMobileReport,
  AdminReport,
  FloodReportInput,
  MyFloodReport,
  UploadedVideo,
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
/** A video recorded on the page (mp4 on most phones, webm on some Android browsers). */
export const VIDEO_KEY = /^flood-reports\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\/[0-9a-f]{16}\.(mp4|webm|mov)$/;
const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
/** A small video can go through this site when the bucket refuses the browser (Vercel caps a request at 4.5 MB). */
export const VIDEO_PROXY_LIMIT = 4 * 1024 * 1024;

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

/**
 * A signed link the phone uploads its video to, straight to R2 (videos are too large to pass through this site).
 * [origin] is allowed to upload to the bucket first (the same rule Admin uploads use).
 */
export async function createVideoTicket(
  reportId: string,
  size: number,
  contentType: string,
  ensureOrigin: () => Promise<unknown>,
): Promise<{ key: string; uploadUrl: string; contentType: string; proxyLimit: number }> {
  if (!UUID.test(reportId)) throw new BadRequestError("Invalid report id");
  if (!Number.isFinite(size) || size <= 0) throw new BadRequestError("The video is empty.");
  if (size > MAX_VIDEO_BYTES) throw new BadRequestError("The video is too large (50 MB at most).");
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const ext = Object.entries(VIDEO_TYPES).find(([, t]) => t === base)?.[0];
  if (!ext) throw new BadRequestError("Only MP4, WebM or MOV videos are accepted.");
  const cfg = r2();
  await ensureOrigin();
  const key = `${PHOTO_PREFIX}${manilaDayPath()}/${reportId.toLowerCase()}/${randomBytes(8).toString("hex")}.${ext}`;
  const type = VIDEO_TYPES[ext] as string;
  return { key, uploadUrl: presign(cfg, "PUT", key, { headers: { "content-type": type }, expiresIn: 3600 }), contentType: type, proxyLimit: VIDEO_PROXY_LIMIT };
}

/** A small video through this site, when the phone cannot reach R2 directly. */
export async function proxyVideoUpload(reportId: string, key: string, bytes: ArrayBuffer): Promise<void> {
  if (!UUID.test(reportId) || !VIDEO_KEY.test(key) || !key.includes(`/${reportId.toLowerCase()}/`)) throw new BadRequestError("Invalid video.");
  if (bytes.byteLength === 0 || bytes.byteLength > VIDEO_PROXY_LIMIT) throw new BadRequestError("The video is too large for this upload path.");
  try {
    await putObject(r2(), key, bytes, VIDEO_TYPES[key.split(".").pop() ?? ""] ?? "video/mp4");
  } catch (err) {
    log.error({ err: err instanceof R2Error ? { code: err.code, status: err.status } : err }, "Flood report video upload failed");
    throw new StorageUnavailable("The video could not be saved. Please try again.");
  }
}

/** The videos a stored report was sent with (malformed entries left out). */
function storedVideos(mobile: Record<string, unknown>): UploadedVideo[] {
  if (!Array.isArray(mobile.videos)) return [];
  return mobile.videos.flatMap((v): UploadedVideo[] => {
    const o = (v ?? {}) as Record<string, unknown>;
    if (typeof o.key !== "string" || !VIDEO_KEY.test(o.key) || typeof o.posterKey !== "string" || !PHOTO_KEY.test(o.posterKey)) return [];
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
    const track = Array.isArray(o.track)
      ? o.track.flatMap((p) => {
          const q = (p ?? {}) as Record<string, unknown>;
          const lat = num(q.latitude);
          const lng = num(q.longitude);
          const t = num(q.t);
          return lat === null || lng === null || t === null ? [] : [{ latitude: lat, longitude: lng, accuracyM: num(q.accuracyM), t }];
        })
      : [];
    return [
      {
        key: o.key,
        posterKey: o.posterKey,
        endPosterKey: typeof o.endPosterKey === "string" && PHOTO_KEY.test(o.endPosterKey) ? o.endPosterKey : null,
        track,
        latitude: num(o.latitude) ?? 0,
        longitude: num(o.longitude) ?? 0,
        accuracyM: num(o.accuracyM),
        takenAt: typeof o.takenAt === "string" ? o.takenAt : new Date(0).toISOString(),
        durationS: num(o.durationS),
      },
    ];
  });
}

/** Size in bytes of an uploaded object, or null when it is not there. */
async function storedSize(key: string): Promise<number | null> {
  const res = await r2Fetch(r2(), "HEAD", key, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res?.ok) return null;
  return Number(res.headers.get("content-length") ?? 0);
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
    .max(MAX_PHOTOS),
  videos: z
    .array(
      z.object({
        key: z.string().regex(VIDEO_KEY, "Invalid video"),
        posterKey: z.string().regex(PHOTO_KEY, "Invalid video"),
        endPosterKey: z.string().regex(PHOTO_KEY, "Invalid video").nullish(),
        // Where the phone was while filming (about one fix a second; at most 15 minutes' worth).
        track: z
          .array(
            z.object({
              latitude: z.number().min(-90).max(90),
              longitude: z.number().min(-180).max(180),
              accuracyM: z.number().min(0).max(100_000).nullable(),
              t: z.number().min(0).max(MAX_VIDEO_SECONDS + 60),
            }),
          )
          .max(900)
          .optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracyM: z.number().min(0).max(100_000).nullable(),
        takenAt: isoTime,
        durationS: z.number().min(0).max(MAX_VIDEO_SECONDS + 60).nullable(),
      }),
    )
    .max(MAX_VIDEOS)
    .default([]),
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
  // Optional: older pages (and senders who do not know it) send none.
  deo: optionalText(120),
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
  if (!input.photos.length && !input.videos?.length) throw new ValidationError("Add at least one photo or video.");
  for (const photo of input.photos) {
    if (!photo.key.includes(`/${id}/`)) throw new ValidationError("A photo does not belong to this report.");
  }
  for (const video of input.videos ?? []) {
    if (!video.key.includes(`/${id}/`) || !video.posterKey.includes(`/${id}/`) || (video.endPosterKey && !video.endPosterKey.includes(`/${id}/`))) {
      throw new ValidationError("A video does not belong to this report.");
    }
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
  for (const video of input.videos ?? []) {
    const [size, poster, endPoster] = await Promise.all([
      storedSize(video.key),
      objectExists(cfg, video.posterKey).catch(() => false),
      video.endPosterKey ? objectExists(cfg, video.endPosterKey).catch(() => false) : Promise.resolve(true),
    ]);
    if (size === null || !poster || !endPoster) throw new ValidationError("The video did not finish uploading. Please send again.");
    if (size > MAX_VIDEO_BYTES) throw new ValidationError("The video is too large (50 MB at most).");
  }

  const editToken = randomBytes(32).toString("base64url");
  const built = buildMobileRecord({ ...input, id });
  const inConsolidated = includedInConsolidated(ip);
  // Photos taken far apart may show a flooded stretch of road rather than one spot.
  const stretch = await analyzeStretch(input.photos, {}, input.videos ?? []);
  const record = { ...built, mobile: { ...built.mobile, ownerTokenHash: hashToken(editToken), inConsolidated, stretch } };
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

type Editor = { kind: "sender" } | { kind: "operator"; name: string };

/**
 * Replaces the sender's report with the edited form (and photo list). Photos left out are deleted from R2.
 * An approved report goes back to "needs review" unless the only change is the time the flood receded.
 */
export async function updateMyReport(id: string, body: unknown): Promise<MyFloodReport> {
  const { token, ...input } = editSchema.parse(body) as Omit<FloodReportInput, "id"> & { token: string };
  const row = await ownRow(id, token);
  const status = row.status ?? "needs_review";
  if (status === "rejected" || status === "ignored") {
    throw new ForbiddenError("OKB operators took this report off the map, so it can no longer be edited. You can still delete it.");
  }
  return applyEdit(row, input, { kind: "sender" });
}

const operatorEditSchema = inputSchema.omit({ id: true, website: true });

/** An OKB operator corrects a mobile report (Admin → Reports). Its review status stays as it is. */
export async function updateReportAsOperator(id: string, operator: string, body: unknown): Promise<MyFloodReport> {
  const input = operatorEditSchema.parse(body) as Omit<FloodReportInput, "id">;
  if (!UUID.test(id)) throw new NotFoundError("Report not found.");
  const row = (await rows([id.toLowerCase()]))[0];
  if (!row) throw new NotFoundError("This report no longer exists.");
  return applyEdit(row, input, { kind: "operator", name: operator });
}

async function applyEdit(row: Row, edited: Omit<FloodReportInput, "id">, editor: Editor): Promise<MyFloodReport> {
  const reportId = row.id;
  const status = row.status ?? "needs_review";
  const old = (row.record.mobile ?? {}) as Record<string, unknown>;
  // Edits change the details and photos; the report's video stays as it was sent.
  const input = { ...edited, videos: storedVideos(old) };
  checkReport(input, reportId, Date.parse(row.created_at));
  const oldKeys = new Set(Array.isArray(old.photos) ? old.photos.map((p) => (p as { key?: string }).key).filter(Boolean) : []);
  const added = input.photos.filter((p) => !oldKeys.has(p.key));
  const cfg = r2();
  const present = await Promise.all(added.map((p) => objectExists(cfg, p.key).catch(() => false)));
  if (present.some((ok) => !ok)) throw new ValidationError("A new photo did not finish uploading. Please try again.");

  // Only the receded time changed: no need for operators to verify the report again.
  const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
  const fields = ["level", "roadStatus", "weather", "startedAt", "locationText", "landmark", "deo", "remarks", "senderName", "contactNumber"] as const;
  const recededOnly =
    fields.every((f) => same(old[f], input[f])) &&
    same(old.depthM, depthOf(input)) &&
    added.length === 0 &&
    input.photos.length === oldKeys.size &&
    !same(old.recededAt, input.recededAt);
  // A sender's edit of an approved report is checked again; an operator's correction keeps the status.
  const nextStatus = editor.kind === "sender" && status === "approved" && !recededOnly ? "needs_review" : status;

  const createdAt = new Date(row.created_at);
  const rebuilt = buildMobileRecord({ ...input, id: reportId }, createdAt);
  // The stretch is worked out again when the photos changed; photos the AI already checked keep their verdict.
  const oldStretch = (old.stretch ?? null) as StoredStretch | null;
  const samePhotos =
    Array.isArray(old.photos) &&
    old.photos.length === input.photos.length &&
    input.photos.every((p, i) => (old.photos as { key?: unknown }[])[i]?.key === p.key);
  const stretch =
    // Reports analysed before streets were tried (version 1) are checked again unless they already had a stretch.
    oldStretch && samePhotos && oldStretch.photoCheck !== "failed" && (oldStretch.version === 2 || oldStretch.result === "stretch")
      ? oldStretch
      : await analyzeStretch(input.photos, oldStretch?.verdicts ?? {}, input.videos ?? []);
  const at = new Date().toISOString();
  const review = (row.record.review ?? {}) as { linkedMessageIds?: unknown; history?: unknown };
  const history = Array.isArray(review.history) ? review.history : [];
  const entry = {
    action: recededOnly ? "marked receded" : "edited",
    at,
    reviewer: editor.kind === "sender" ? "the sender (OKB Mobile)" : `operator ${editor.name}`.slice(0, 100),
    notes: nextStatus !== status ? "Edited after approval; needs review again." : null,
  };
  const record = {
    ...rebuilt,
    status: nextStatus,
    updatedAt: at,
    review: { linkedMessageIds: [], ...review, history: [...history, entry].slice(-20) },
    mobile: {
      ...rebuilt.mobile,
      ownerTokenHash: old.ownerTokenHash,
      inConsolidated: old.inConsolidated === true,
      stretch,
      editedAt: at,
      ...(editor.kind === "operator" ? { operatorEditedAt: at, operatorEditedBy: editor.name.slice(0, 100) } : {}),
    },
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
  log.info({ id: reportId, recededOnly, removed: removed.length, added: added.length }, `Mobile flood report edited by ${editor.kind}`);
  const view = toMyReport({ id: reportId, status: nextStatus, created_at: row.created_at, record }, await liveRainNow());
  if (!view) throw new StorageUnavailable("Your changes were saved but could not be shown.");
  return view;
}

/**
 * Admin → Reports: the reports of the last [days] (null: all time), newest first: OKB Mobile reports (any
 * status, with the operator-only fields) and every WhatsApp / Viber message, each with the photos and videos
 * operators added.
 */
export async function listReportsForAdmin(days: number | null): Promise<AdminReport[]> {
  if (!supabase()) return [];
  const weather = await floodMapWeather().catch(() => null);
  const [mobile, bridge] = await Promise.all([
    listMobileReportsForAdmin(days),
    weather ? bridgeReportsForAdmin(days, weather) : Promise.resolve([]),
  ]);
  return [...mobile, ...bridge].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

async function listMobileReportsForAdmin(days: number | null): Promise<AdminMobileReport[]> {
  const since = days ? `&created_at=gte.${new Date(Date.now() - days * 24 * 3_600_000).toISOString()}` : "";
  const res = await rest(
    `${REPORTS}?select=id,status,created_at,record&platform=eq.${MOBILE_REPORT_PLATFORM}${since}&order=created_at.desc&limit=500`,
  );
  if (!res.ok) {
    log.error({ status: res.status }, "Admin flood report list rejected");
    throw new StorageUnavailable("Mobile reports could not be loaded.");
  }
  const [liveRain, media] = await Promise.all([liveRainNow(), reportMediaIndex()]);
  return ((await res.json()) as Row[]).flatMap((row): AdminMobileReport[] => {
    const view = toMyReport(row, liveRain);
    if (!view) return [];
    const m = (row.record.mobile ?? {}) as Record<string, unknown>;
    return [
      {
        ...view,
        kind: "mobile",
        // Photos stay the report's own (the edit form saves that list); videos: the sender's own, then the operators'.
        videos: [...view.videos, ...(media.get(row.id) ?? NO_MEDIA).videos],
        contactNumber: typeof m.contactNumber === "string" ? m.contactNumber : null,
        inConsolidated: m.inConsolidated === true,
        hasEditKey: typeof m.ownerTokenHash === "string",
        operatorEditedBy: typeof m.operatorEditedBy === "string" ? m.operatorEditedBy : null,
      },
    ];
  });
}

/** Deletes a mobile report and its photos, unless OKB operators already made it part of an incident. */
async function removeReport(row: Row, by: string): Promise<void> {
  const linked = await rest(`okb_command_incidents?select=id&report_id=eq.${row.id}&limit=1`);
  if (linked.ok && ((await linked.json()) as unknown[]).length) {
    throw new ConflictError("OKB operators already made this report part of an incident, so it can no longer be deleted.");
  }
  // Its rows in the bridge's automated reports would block the delete; a sent report keeps its own list of ids.
  const items = await rest(`okb_bridge_consolidated_report_items?report_id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" });
  if (!items.ok && items.status !== 404) log.warn({ status: items.status }, "Consolidated report rows of a deleted report not removed");
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
  // The video and its first frame go too.
  photos.push(
    ...storedVideos((row.record.mobile ?? {}) as Record<string, unknown>).flatMap((v) => [v.key, v.posterKey, ...(v.endPosterKey ? [v.endPosterKey] : [])]),
  );
  const cfg = getOperationsR2Config();
  if (cfg) await Promise.all(photos.map((k) => deleteObject(cfg, k).catch((err) => log.warn({ err, key: k }, "Photo of deleted report not removed from R2"))));
  await deleteAllMedia(row.id);
  await forgetEngagement(row.id);
  invalidateAggregates();
  memo = null;
  log.info({ id: row.id, photos: photos.length, by }, "Mobile flood report deleted");
}

/** The sender deletes their report (checked with its edit key). */
export async function deleteMyReport(id: string, body: unknown): Promise<void> {
  await removeReport(await ownRow(id, (body as { token?: unknown } | null)?.token), "sender");
}

/**
 * An OKB operator deletes a report (spam, a duplicate, a test, or a mobile report sent before senders had edit
 * keys). A mobile report is deleted here; a WhatsApp / Viber report is deleted through the OKB Bridge, which
 * keeps it in memory for its automated reports.
 */
export async function deleteReportAsOperator(id: string, operator: string): Promise<void> {
  if (!UUID.test(id)) throw new NotFoundError("Report not found.");
  const by = `operator ${operator}`.slice(0, 120);
  const row = (await rows([id.toLowerCase()]))[0];
  if (row) return removeReport(row, by);
  await deleteBridgeReport(id.toLowerCase(), by);
}

/** The stored report's id (any source), or NotFound. */
export async function assertReportExists(id: string): Promise<string> {
  if (!UUID.test(id)) throw new NotFoundError("Report not found.");
  const res = await rest(`${REPORTS}?select=id&id=eq.${id.toLowerCase()}&limit=1`);
  if (!res.ok) throw new StorageUnavailable("The report could not be checked. Please try again.");
  if (!((await res.json()) as unknown[]).length) throw new NotFoundError("This report no longer exists.");
  return id.toLowerCase();
}

async function deleteBridgeReport(id: string, by: string): Promise<void> {
  await assertReportExists(id);
  const linked = await rest(`okb_command_incidents?select=id&report_id=eq.${id}&limit=1`);
  if (linked.ok && ((await linked.json()) as unknown[]).length) {
    throw new ConflictError("OKB operators already made this report part of an incident, so it can no longer be deleted.");
  }
  const cfg = getReportsConfig();
  if (!cfg.bridgeApiUrl || !cfg.bridgeAdminToken) {
    throw new StorageUnavailable("Deleting WhatsApp / Viber reports needs OKB_BRIDGE_API_URL and OKB_BRIDGE_ADMIN_TOKEN on the server.");
  }
  let res: Response;
  try {
    res = await fetch(`${cfg.bridgeApiUrl}/api/v1/reports/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${cfg.bridgeAdminToken}` },
      cache: "no-store",
      // The bridge runs on a free Render instance that may need to wake up.
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    log.error({ err }, "OKB Bridge report delete failed (network)");
    throw new StorageUnavailable("The OKB Bridge backend did not respond. The report was not deleted.");
  }
  if (res.status === 409) throw new ConflictError("The OKB Bridge is still processing this report. Try again in a minute.");
  if (res.status === 404) {
    const text = await res.text().catch(() => "");
    // An older bridge without the delete endpoint answers "not found" for the route itself.
    if (!/report not found/i.test(text)) {
      throw new StorageUnavailable("The OKB Bridge backend cannot delete reports yet. Redeploy it with the latest version.");
    }
  } else if (!res.ok) {
    log.error({ status: res.status }, "OKB Bridge report delete rejected");
    throw new StorageUnavailable("The OKB Bridge backend rejected the delete. The report was not deleted.");
  }
  await deleteAllMedia(id);
  await forgetEngagement(id);
  invalidateAggregates();
  memo = null;
  log.info({ id, by }, "WhatsApp / Viber report deleted");
}

/** Visitors' reactions and comments on a deleted report's photos go with it (best effort). */
async function forgetEngagement(id: string): Promise<void> {
  const { forgetFloodReport } = await import("@/features/gallery/server/engagement");
  await forgetFloodReport(id).catch((err) => log.warn({ err, id }, "Reactions and comments of a deleted report not removed"));
}

// ---------------------------------------------------------------------------
// Public map
// ---------------------------------------------------------------------------

export const MAP_HOURS = [6, 24, 72, 168] as const;
let memo: { at: number; hours: number; data: PublicFloodReportList } | null = null;

/** Drops the public map's 15-second memo (after a report changed elsewhere, e.g. a review). */
export function invalidatePublicReports(): void {
  memo = null;
}

/**
 * Reports of the last [hours] for the public map: OKB Mobile reports and WhatsApp / Viber flood reports
 * (rejected reports are left out), with the photos and videos operators added. 15-second memo.
 */
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
  const weather = await floodMapWeather().catch(() => null);
  const liveRain = weather?.state === "wet";
  const [media, bridge] = await Promise.all([
    reportMediaIndex(),
    // WhatsApp / Viber reports: a failure leaves them out, never the mobile reports.
    weather
      ? bridgePins(hours, weather).catch((err) => {
          log.warn({ err }, "WhatsApp / Viber reports left off the public map");
          return [] as PublicFloodReport[];
        })
      : Promise.resolve([] as PublicFloodReport[]),
  ]);
  const mobile = rows
    .map((row) => toPublicReport(row, liveRain))
    .filter((r): r is PublicFloodReport => r !== null)
    .map((r) => {
      const added = media.get(r.id);
      return added ? { ...r, photos: [...r.photos, ...added.photos], videos: [...r.videos, ...added.videos] } : r;
    });
  const data = {
    generatedAt,
    hours,
    liveRain,
    reports: [...mobile, ...bridge].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)),
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
