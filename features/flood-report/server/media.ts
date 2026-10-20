import "server-only";
import { randomBytes } from "node:crypto";
import { ApiError, BadRequestError, NotFoundError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObject,
  getOperationsR2Config,
  listObjects,
  listParts,
  objectExists,
  presign,
  presignPart,
  putObject,
  R2Error,
  type R2Config,
} from "@/features/operations/server/r2";
import type { UploadTicket } from "@/features/admin/types";
import type { ReportPhoto, ReportVideo } from "@/features/reports/types";

/**
 * Photos and videos OKB operators add to a report in Admin → Reports (any report: OKB Mobile, WhatsApp or
 * Viber). They live in the operations R2 bucket under `report-media/<report id>/`, apart from the report
 * record itself, so the bridge (which rewrites its WhatsApp/Viber records) never drops them. Uploads go
 * straight from the browser to R2 with a signed link (videos can be large); small files can go through this
 * site when the bucket does not allow direct uploads yet.
 */

const log = logger.child({ module: "report-media" });

export const MEDIA_PREFIX = "report-media/";
export const MEDIA_KEY = /^report-media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{16}\.(jpg|jpeg|png|webp|mp4|m4v|mov|webm|3gp)$/;
const VIDEO = /\.(mp4|m4v|mov|webm|3gp)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Largest photo or video an operator can add. */
export const MAX_MEDIA_BYTES = 1024 * 1024 * 1024;
/**
 * Files above this go up in parts of PART_BYTES, several at a time (much faster than one stream on mobile and
 * high-latency links, and a dropped connection only resends one part).
 */
const MULTIPART_FROM = 20 * 1024 * 1024;
const PART_BYTES = 10 * 1024 * 1024;
/** Requests through this site are capped by Vercel (4.5 MB). */
export const MEDIA_PROXY_LIMIT = 4 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
};

class StorageUnavailable extends ApiError {
  constructor(message: string) {
    super(503, "INTERNAL_ERROR", message, { reason: "storage_unavailable" });
  }
}

function r2(): R2Config {
  const cfg = getOperationsR2Config();
  if (!cfg) throw new StorageUnavailable("Photo storage (Cloudflare R2) is not configured on the server.");
  return cfg;
}

function storageFailed(err: unknown, what: string): never {
  log.error({ err: err instanceof R2Error ? { code: err.code, status: err.status } : err }, what);
  throw new StorageUnavailable("The photo storage (Cloudflare R2) could not be reached. Please try again.");
}

export const mediaUrl = (key: string) => `/api/flood-reports/media?key=${encodeURIComponent(key)}`;
export const isVideoKey = (key: string) => VIDEO.test(key);

export interface ReportMedia {
  photos: ReportPhoto[];
  videos: ReportVideo[];
}

export const NO_MEDIA: ReportMedia = { photos: [], videos: [] };

let memo: { at: number; index: Map<string, ReportMedia> } | null = null;

/** Operator media of every report, by report id (oldest first). 30-second memo; empty when R2 is unavailable. */
export async function reportMediaIndex(): Promise<Map<string, ReportMedia>> {
  if (memo && Date.now() - memo.at < 30_000) return memo.index;
  const cfg = getOperationsR2Config();
  const index = new Map<string, ReportMedia>();
  if (!cfg) return index;
  try {
    const objects = await listObjects(cfg, MEDIA_PREFIX);
    objects.sort((a, b) => a.lastModified.localeCompare(b.lastModified) || a.key.localeCompare(b.key));
    for (const obj of objects) {
      const id = MEDIA_KEY.exec(obj.key)?.[1];
      if (!id || obj.size === 0) continue;
      const media = index.get(id) ?? { photos: [], videos: [] };
      if (isVideoKey(obj.key)) media.videos.push({ key: obj.key, url: mediaUrl(obj.key) });
      else media.photos.push({ key: obj.key, url: mediaUrl(obj.key), latitude: null, longitude: null, accuracyM: null, takenAt: obj.lastModified });
      index.set(id, media);
    }
  } catch (err) {
    // The maps still show the reports; only the added media is missing until R2 answers again.
    log.warn({ err: err instanceof R2Error ? { code: err.code, status: err.status } : err }, "Report media could not be listed");
    return memo?.index ?? index;
  }
  memo = { at: Date.now(), index };
  return index;
}

export function invalidateReportMedia(): void {
  memo = null;
}

/** A report's operator media (fresh, not memoized). */
export async function mediaOfReport(reportId: string): Promise<ReportMedia> {
  invalidateReportMedia();
  return (await reportMediaIndex()).get(reportId) ?? NO_MEDIA;
}

function extOf(name: string): string {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
}

function assertKey(reportId: string, key: string): void {
  const match = MEDIA_KEY.exec(key);
  if (!match || match[1] !== reportId) throw new NotFoundError("This file does not belong to the report.");
}

/** A signed link the browser uploads one photo or video to (straight to R2). */
export async function createMediaTicket(reportId: string, fileName: string, contentType: string, size: number): Promise<UploadTicket> {
  if (!UUID.test(reportId)) throw new NotFoundError("Report not found.");
  let ext = extOf(fileName);
  if (ext === "jpeg") ext = "jpg";
  if (!CONTENT_TYPES[ext]) throw new BadRequestError("Only photos (JPG, PNG, WebP) and videos (MP4, MOV, WebM, 3GP) can be added.");
  if (size <= 0 || size > MAX_MEDIA_BYTES) throw new BadRequestError("Files can be up to 1 GB.");
  const type = /^(image|video)\/[\w.+-]+$/.test(contentType) ? contentType : CONTENT_TYPES[ext]!;
  const key = `${MEDIA_PREFIX}${reportId}/${randomBytes(8).toString("hex")}.${ext}`;
  if (size > MULTIPART_FROM) {
    const cfg = r2();
    const uploadId = await createMultipartUpload(cfg, key, type).catch((err) => storageFailed(err, "Report media upload not started"));
    const count = Math.ceil(size / PART_BYTES);
    return {
      key,
      uploadUrl: "",
      contentType: type,
      proxyLimit: MEDIA_PROXY_LIMIT,
      multipart: { uploadId, partSize: PART_BYTES, partUrls: Array.from({ length: count }, (_, i) => presignPart(cfg, key, uploadId, i + 1)) },
    };
  }
  return {
    key,
    uploadUrl: presign(r2(), "PUT", key, { headers: { "content-type": type }, expiresIn: 3600 }),
    contentType: type,
    proxyLimit: MEDIA_PROXY_LIMIT,
  };
}

/** Upload through this site for small files when the browser cannot reach R2 directly. */
export async function proxyMediaUpload(reportId: string, key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  assertKey(reportId, key);
  if (body.byteLength === 0 || body.byteLength > MEDIA_PROXY_LIMIT) throw new BadRequestError("File too large for this upload path.");
  await putObject(r2(), key, body, contentType || CONTENT_TYPES[extOf(key)] || "application/octet-stream").catch((err) =>
    storageFailed(err, "Report media upload failed"),
  );
  invalidateReportMedia();
}

/** After a direct browser upload: joins the parts of a multipart upload, then checks the file arrived. */
export async function confirmMedia(reportId: string, key: string, uploadId?: string, partCount?: number): Promise<void> {
  assertKey(reportId, key);
  if (uploadId) {
    const cfg = r2();
    // The part ETags come from R2 itself, so the bucket does not need to expose them to the browser.
    const parts = await listParts(cfg, key, uploadId).catch((err) => storageFailed(err, "Report media parts not listed"));
    if (partCount !== undefined && parts.length !== partCount) {
      throw new BadRequestError(`Only ${parts.length} of ${partCount} parts reached storage. Please try again.`);
    }
    await completeMultipartUpload(cfg, key, uploadId, parts).catch((err) => storageFailed(err, "Report media parts not joined"));
  }
  const there = await objectExists(r2(), key).catch((err) => storageFailed(err, "Report media check failed"));
  if (!there) throw new NotFoundError("The upload did not reach storage. Please try again.");
  invalidateReportMedia();
  log.info({ reportId, key }, "Report media added");
}

/** Drops an unfinished multipart upload (cancelled or failed in the browser). */
export async function abortMedia(reportId: string, key: string, uploadId: string): Promise<void> {
  assertKey(reportId, key);
  await abortMultipartUpload(r2(), key, uploadId).catch((err) => log.warn({ err, key }, "Unfinished upload not aborted"));
}

export async function deleteMedia(reportId: string, key: string): Promise<void> {
  assertKey(reportId, key);
  await deleteObject(r2(), key).catch((err) => storageFailed(err, "Report media delete failed"));
  invalidateReportMedia();
  log.info({ reportId, key }, "Report media deleted");
}

/** Removes every operator file of a deleted report (failures are logged, never thrown). */
export async function deleteAllMedia(reportId: string): Promise<void> {
  const cfg = getOperationsR2Config();
  if (!cfg) return;
  const media = await mediaOfReport(reportId);
  const keys = [...media.photos, ...media.videos].map((m) => m.key);
  await Promise.all(keys.map((k) => deleteObject(cfg, k).catch((err) => log.warn({ err, key: k }, "Media of deleted report not removed"))));
  invalidateReportMedia();
}
