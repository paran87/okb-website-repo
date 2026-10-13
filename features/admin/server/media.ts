import "server-only";
import { ApiError, BadRequestError, ConflictError, NotFoundError } from "@/lib/api/errors";
import {
  MAX_UPLOAD_BYTES,
  mediaKindOf,
  WEBSITE_GALLERY_PREFIX,
  type CollectionConfig,
} from "@/features/admin/collections";
import {
  invalidateOperationsListing,
  listOperationsMedia,
  TRASH_PREFIX,
} from "@/features/operations/server/media";
import {
  deleteObject,
  getBucketCors,
  getOperationsR2Config,
  listObjects,
  moveObject,
  objectExists,
  presign,
  putBucketCors,
  putObject,
  R2Error,
  type R2Config,
  type R2Object,
} from "@/features/operations/server/r2";
import { siteDbConfigured, siteRest } from "@/features/admin/server/supabase";
import type { AdminMediaItem, AdminMediaList, MediaKind, UploadTicket } from "@/features/admin/types";

/**
 * Photos and videos the admin manages, stored in the operations R2 bucket.
 * Deleting moves a file to the bucket's trash folder (restorable from Admin → Media → Trash);
 * "Delete forever" removes it. Titles and captions live in Supabase (okb_site_media).
 */

/** Requests through this site are capped by Vercel (4.5 MB); larger files go straight to R2. */
export const PROXY_LIMIT = 4 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
};

export function mediaFileUrl(key: string): string {
  return `/api/media/file?key=${encodeURIComponent(key)}`;
}

function storageMessage(err: R2Error): string {
  if (err.code === "AccessDenied") return "Cloudflare R2 denied access to the media bucket. Check the R2 API token.";
  if (err.code === "NoSuchBucket") return "Cloudflare R2 could not find the media bucket. Check OPERATIONS_R2_BUCKET.";
  return "The media storage (Cloudflare R2) could not be reached.";
}

/** Rethrows R2 failures as a readable API error. */
export function storageError(err: unknown): never {
  if (err instanceof R2Error) {
    throw new ApiError(502, "INTERNAL_ERROR", storageMessage(err), { reason: "storage_error", code: err.code });
  }
  throw err;
}

function r2(): R2Config {
  const cfg = getOperationsR2Config();
  if (!cfg) {
    throw new ApiError(503, "INTERNAL_ERROR", "Media storage (Cloudflare R2) is not configured on the server.", {
      reason: "storage_not_configured",
    });
  }
  return cfg;
}

function afterChange(c: CollectionConfig): void {
  if (c.operationsSection) invalidateOperationsListing(c.prefix);
  if (c.prefix === WEBSITE_GALLERY_PREFIX) galleryCache = null;
}

function assertInCollection(c: CollectionConfig, key: string, trash = false): void {
  const prefix = trash ? `${TRASH_PREFIX}${c.prefix}` : c.prefix;
  if (!key.startsWith(prefix) || key.includes("..") || key.length > 1024) {
    throw new NotFoundError("File not found in this collection");
  }
}

function baseName(key: string): string {
  return key.split("/").pop() || key;
}

function extOf(name: string): string {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
}

/** A storage-safe file name that keeps the extension. */
export function safeFileName(input: string, forceExt?: string): string {
  const raw = input.split(/[\\/]/).pop() ?? "";
  const ext = forceExt ?? extOf(raw);
  const stem = (ext ? raw.slice(0, raw.length - ext.length - 1) : raw)
    .normalize("NFKD")
    .replace(/[^\w.\- ()]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-{2,}/g, "-")
    .trim()
    .replace(/^[.\-]+|[.\-]+$/g, "")
    .slice(0, 120);
  return `${stem || "file"}${ext ? `.${ext}` : ""}`;
}

async function freeKey(cfg: R2Config, folder: string, name: string): Promise<string> {
  const key = `${folder}${name}`;
  if (!(await objectExists(cfg, key))) return key;
  const ext = extOf(name);
  const stem = ext ? name.slice(0, name.length - ext.length - 1) : name;
  return `${folder}${stem}-${Date.now().toString(36)}${ext ? `.${ext}` : ""}`;
}

// ---------------------------------------------------------------- captions

interface CaptionRow {
  key: string;
  title: string | null;
  caption: string | null;
}

async function captionsUnder(prefix: string): Promise<Map<string, CaptionRow> | null> {
  if (!siteDbConfigured()) return null;
  try {
    const params = new URLSearchParams({ select: "key,title,caption", key: `like.${prefix.replace(/[*%]/g, "")}*` });
    const { data } = await siteRest<CaptionRow[]>(`okb_site_media?${params}`);
    return new Map((data ?? []).map((r) => [r.key, r]));
  } catch {
    return null;
  }
}

async function saveCaption(key: string, title: string | null, caption: string | null, by: string): Promise<void> {
  if (!title && !caption) {
    await siteRest(`okb_site_media?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", prefer: ["return=minimal"] });
    return;
  }
  await siteRest("okb_site_media?on_conflict=key", {
    method: "POST",
    body: { key, title, caption, updated_by: by, updated_at: new Date().toISOString() },
    prefer: ["resolution=merge-duplicates", "return=minimal"],
  });
}

async function moveCaption(from: string, to: string): Promise<void> {
  if (!siteDbConfigured()) return;
  try {
    await siteRest(`okb_site_media?key=eq.${encodeURIComponent(from)}`, {
      method: "PATCH",
      body: { key: to, updated_at: new Date().toISOString() },
      prefer: ["return=minimal"],
    });
  } catch {
    /* captions are optional */
  }
}

// ---------------------------------------------------------------- listing

function toItem(obj: R2Object, kind: MediaKind, caption: CaptionRow | undefined, shown: boolean | null): AdminMediaItem {
  return {
    key: obj.key,
    name: baseName(obj.key),
    kind,
    url: mediaFileUrl(obj.key),
    size: obj.size,
    lastModified: obj.lastModified,
    title: caption?.title ?? null,
    caption: caption?.caption ?? null,
    shownInCommandCenter: shown,
  };
}

export async function listMedia(c: CollectionConfig, view: "files" | "trash"): Promise<AdminMediaList> {
  const cfg = r2();
  const trash = view === "trash";
  const prefix = trash ? `${TRASH_PREFIX}${c.prefix}` : c.prefix;
  const [objects, captions, shown] = await Promise.all([
    listObjects(cfg, prefix).catch(storageError),
    captionsUnder(c.prefix),
    !trash && c.operationsSection ? shownInCommandCenter(c) : Promise.resolve(null),
  ]);
  const items = objects.flatMap((obj) => {
    const kind = obj.size > 0 ? mediaKindOf(obj.key) : null;
    if (!kind) return [];
    const original = trash ? obj.key.slice(TRASH_PREFIX.length) : obj.key;
    return [toItem(obj, kind, captions?.get(original), shown ? shown.has(obj.key) : null)];
  });
  items.sort((a, b) => b.lastModified.localeCompare(a.lastModified) || a.key.localeCompare(b.key));
  return { collection: c.id, view, items, captionsAvailable: captions !== null };
}

async function shownInCommandCenter(c: CollectionConfig): Promise<Set<string> | null> {
  const section = c.operationsSection as Parameters<typeof listOperationsMedia>[0];
  try {
    const [photos, videos] = await Promise.all([
      listOperationsMedia(section, "photos"),
      listOperationsMedia(section, "videos"),
    ]);
    return new Set([...photos.items, ...videos.items].map((i) => i.key));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- uploads

export async function createUploadTicket(
  c: CollectionConfig,
  fileName: string,
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  const cfg = r2();
  const name = safeFileName(fileName);
  const kind = mediaKindOf(name);
  if (!kind) throw new BadRequestError("Only photos (JPG, PNG, WebP, GIF) and videos (MP4, MOV, WebM, 3GP) can be uploaded.");
  if (size <= 0 || size > MAX_UPLOAD_BYTES) throw new BadRequestError("Files can be up to 1 GB.");
  const type = /^(image|video)\/[\w.+-]+$/.test(contentType) ? contentType : CONTENT_TYPES[extOf(name)] ?? "application/octet-stream";
  const key = await freeKey(cfg, c.prefix, name).catch(storageError);
  return {
    key,
    uploadUrl: presign(cfg, "PUT", key, { headers: { "content-type": type }, expiresIn: 3600 }),
    contentType: type,
    proxyLimit: PROXY_LIMIT,
  };
}

/** Server-side upload for small files when the browser cannot reach R2 directly. */
export async function proxyUpload(c: CollectionConfig, key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  assertInCollection(c, key);
  if (!mediaKindOf(key)) throw new BadRequestError("Unsupported file type.");
  if (body.byteLength === 0 || body.byteLength > PROXY_LIMIT) throw new BadRequestError("File too large for this upload path.");
  await putObject(r2(), key, body, contentType || CONTENT_TYPES[extOf(key)] || "application/octet-stream").catch(storageError);
  afterChange(c);
}

/** Called after a direct browser upload finishes, so listings refresh. */
export async function confirmUpload(c: CollectionConfig, key: string): Promise<void> {
  assertInCollection(c, key);
  if (!(await objectExists(r2(), key).catch(storageError))) throw new NotFoundError("The upload did not reach storage.");
  afterChange(c);
}

// ---------------------------------------------------------------- edits

export interface MediaEdit {
  title?: string | null;
  caption?: string | null;
  fileName?: string | null;
}

export async function updateMedia(c: CollectionConfig, key: string, edit: MediaEdit, by: string): Promise<{ key: string }> {
  assertInCollection(c, key);
  const cfg = r2();
  let current = key;
  if (edit.fileName && edit.fileName.trim()) {
    const ext = extOf(key);
    const name = safeFileName(edit.fileName.trim().replace(new RegExp(`\\.${ext}$`, "i"), ""), ext);
    const folder = key.slice(0, key.lastIndexOf("/") + 1);
    const target = `${folder}${name}`;
    if (target !== key) {
      if (await objectExists(cfg, target).catch(storageError)) throw new ConflictError("A file with that name already exists.");
      await moveObject(cfg, key, target).catch(storageError);
      await moveCaption(key, target);
      current = target;
    }
  }
  if (edit.title !== undefined || edit.caption !== undefined) {
    const title = edit.title?.trim() || null;
    const caption = edit.caption?.trim() || null;
    await saveCaption(current, title, caption, by);
  }
  afterChange(c);
  return { key: current };
}

export async function deleteMedia(c: CollectionConfig, key: string): Promise<void> {
  assertInCollection(c, key);
  await moveObject(r2(), key, `${TRASH_PREFIX}${key}`).catch(storageError);
  afterChange(c);
}

export async function restoreMedia(c: CollectionConfig, trashKey: string): Promise<{ key: string }> {
  assertInCollection(c, trashKey, true);
  const cfg = r2();
  const original = trashKey.slice(TRASH_PREFIX.length);
  const folder = original.slice(0, original.lastIndexOf("/") + 1);
  const target = await freeKey(cfg, folder, baseName(original)).catch(storageError);
  await moveObject(cfg, trashKey, target).catch(storageError);
  if (target !== original) await moveCaption(original, target);
  afterChange(c);
  return { key: target };
}

export async function purgeMedia(c: CollectionConfig, trashKey: string): Promise<void> {
  assertInCollection(c, trashKey, true);
  await deleteObject(r2(), trashKey).catch(storageError);
  const original = trashKey.slice(TRASH_PREFIX.length);
  if (siteDbConfigured()) {
    await siteRest(`okb_site_media?key=eq.${encodeURIComponent(original)}`, {
      method: "DELETE",
      prefer: ["return=minimal"],
    }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------- direct uploads (bucket CORS)

function corsRule(origin: string): string {
  return [
    "<CORSRule>",
    `<AllowedOrigin>${origin.replace(/[<>&"']/g, "")}</AllowedOrigin>`,
    "<AllowedMethod>PUT</AllowedMethod>",
    "<AllowedMethod>GET</AllowedMethod>",
    "<AllowedMethod>HEAD</AllowedMethod>",
    "<AllowedHeader>*</AllowedHeader>",
    "<ExposeHeader>ETag</ExposeHeader>",
    "<MaxAgeSeconds>3600</MaxAgeSeconds>",
    "</CORSRule>",
  ].join("");
}

function corsAllows(xml: string | null, origin: string): boolean {
  if (!xml) return false;
  return [...xml.matchAll(/<CORSRule>([\s\S]*?)<\/CORSRule>/g)].some(([, rule = ""]) => {
    const origins = [...rule.matchAll(/<AllowedOrigin>([^<]*)<\/AllowedOrigin>/g)].map((m) => m[1]);
    const methods = [...rule.matchAll(/<AllowedMethod>([^<]*)<\/AllowedMethod>/g)].map((m) => m[1]);
    return (origins.includes(origin) || origins.includes("*")) && methods.includes("PUT");
  });
}

export async function directUploadStatus(origin: string): Promise<"enabled" | "disabled" | "unknown"> {
  try {
    return corsAllows(await getBucketCors(r2()), origin) ? "enabled" : "disabled";
  } catch {
    return "unknown";
  }
}

/** Adds a CORS rule for this site's origin (keeps the bucket's other rules). */
export async function enableDirectUploads(origin: string): Promise<void> {
  const cfg = r2();
  try {
    const current = await getBucketCors(cfg);
    if (corsAllows(current, origin)) return;
    const rules = current ? [...current.matchAll(/<CORSRule>[\s\S]*?<\/CORSRule>/g)].map((m) => m[0]) : [];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">${[
      ...rules,
      corsRule(origin),
    ].join("")}</CORSConfiguration>`;
    await putBucketCors(cfg, xml);
  } catch (err) {
    if (err instanceof R2Error && (err.code === "AccessDenied" || err.status === 403)) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "The R2 API token cannot change bucket settings. Add the CORS rule in the Cloudflare dashboard (shown below).",
        { reason: "cors_denied" },
      );
    }
    storageError(err);
  }
}

// ---------------------------------------------------------------- public gallery

export interface GalleryItem {
  key: string;
  kind: MediaKind;
  url: string;
  title: string | null;
  caption: string | null;
  lastModified: string;
}

const GALLERY_TTL_MS = 30_000;
let galleryCache: { at: number; items: Promise<GalleryItem[]> } | null = null;

async function loadGallery(): Promise<GalleryItem[]> {
  const cfg = getOperationsR2Config();
  if (!cfg) return [];
  const [objects, captions] = await Promise.all([listObjects(cfg, WEBSITE_GALLERY_PREFIX), captionsUnder(WEBSITE_GALLERY_PREFIX)]);
  return objects
    .flatMap((obj) => {
      const kind = obj.size > 0 ? mediaKindOf(obj.key) : null;
      if (!kind) return [];
      const c = captions?.get(obj.key);
      return [
        {
          key: obj.key,
          kind,
          url: mediaFileUrl(obj.key),
          title: c?.title ?? null,
          caption: c?.caption ?? null,
          lastModified: obj.lastModified,
        },
      ];
    })
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

/** Published website gallery (newest first). Empty when storage is not configured or unreachable. */
export async function listGallery(): Promise<GalleryItem[]> {
  if (!galleryCache || Date.now() - galleryCache.at > GALLERY_TTL_MS) {
    const items = loadGallery();
    galleryCache = { at: Date.now(), items };
    items.catch(() => {
      galleryCache = null;
    });
  }
  return galleryCache.items.catch(() => []);
}
