import "server-only";
import { logger } from "@/lib/logger";
import type {
  CollectedMediaItem,
  MediaKind,
  MediaListQuery,
  MediaListResult,
  MediaSource,
  MediaStatus,
} from "@/features/media-collector/types";
import {
  getOperationsR2Config,
  presign,
} from "@/features/operations/server/r2";
import { getReportsConfig } from "@/features/reports/server/config";
import { ReportsBackendError } from "@/features/reports/server/store";

/**
 * Reads okb_ingested_media (written only by the OKB bridge backend for the OKB Media Collector) through
 * Supabase's REST API with the service-role key, server side. Files stay private in R2: the browser only gets
 * short-lived signed links (previews here, View/Download through /api/media-collector/[id]/file).
 */

const TABLE = "okb_ingested_media";
const PAGE = 24;
const TIMEOUT_MS = 12_000;
export const LINK_TTL_S = 10 * 60;
const log = logger.child({ module: "media-collector" });

class TableMissing extends Error {}

async function rest(
  path: string,
  params: URLSearchParams,
  count = false,
): Promise<{ data: unknown; total: number | null }> {
  const cfg = getReportsConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey)
    throw new ReportsBackendError();
  let res: Response;
  try {
    res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/${path}?${params.toString()}`,
      {
        headers: {
          apikey: cfg.supabaseServiceKey,
          Authorization: `Bearer ${cfg.supabaseServiceKey}`,
          Accept: "application/json",
          ...(count ? { Prefer: "count=exact" } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch (err) {
    log.error({ err, path }, "Supabase request failed");
    throw new ReportsBackendError();
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    if (body.code === "PGRST205" || body.code === "42P01")
      throw new TableMissing(path);
    log.error(
      { status: res.status, code: body.code, path },
      "Supabase query error",
    );
    throw new ReportsBackendError();
  }
  const range = res.headers.get("content-range");
  const total = range?.split("/")[1];
  return {
    data: await res.json(),
    total: total && total !== "*" ? Number(total) : null,
  };
}

/** PostgREST value for ilike inside a quoted filter. */
const like = (term: string) => `*${term.replace(/[\\*%,()"]/g, "")}*`;

type Row = Record<string, unknown>;
const s = (row: Row, k: string) =>
  typeof row[k] === "string" ? (row[k] as string) : null;

function previewUrl(row: Row): string | null {
  const key = s(row, "r2_key");
  const mime = s(row, "mime_type") ?? "";
  const status = s(row, "media_status");
  if (
    !key ||
    (status !== "stored" && status !== "duplicate") ||
    !/^image\/(jpeg|png|webp)$/.test(mime)
  )
    return null;
  const cfg = getOperationsR2Config();
  return cfg ? presign(cfg, "GET", key, { expiresIn: LINK_TTL_S }) : null;
}

function toItem(row: Row, reports: Map<string, string>): CollectedMediaItem {
  const message = (row.message ?? null) as Row | null;
  const status = (s(row, "media_status") ?? "none") as MediaStatus;
  const messageId = s(row, "message_id");
  return {
    id: s(row, "id") ?? "",
    channel: "collector",
    source: (s(row, "source") ?? "whatsapp") as MediaSource,
    conversationType:
      s(row, "conversation_type") === "direct" ? "direct" : "group",
    groupName: s(row, "group_name"),
    groupId: s(row, "group_id"),
    senderName: s(row, "sender_name"),
    senderId: s(row, "sender_id"),
    receivedAt: s(row, "message_received_at"),
    createdAt: s(row, "created_at") ?? "",
    kind: s(row, "media_kind") as MediaKind | null,
    mimeType: s(row, "mime_type"),
    fileName: s(row, "original_file_name") ?? s(row, "stored_file_name"),
    fileSizeBytes:
      typeof row.file_size_bytes === "number"
        ? row.file_size_bytes
        : row.file_size_bytes
          ? Number(row.file_size_bytes)
          : null,
    sha256: s(row, "sha256"),
    status,
    statusReason: s(row, "media_status_reason"),
    hasFile:
      Boolean(s(row, "r2_key")) &&
      (status === "stored" || status === "duplicate"),
    previewUrl: previewUrl(row),
    reference: `okb-media:${s(row, "id")}`,
    messageId,
    messageText: message ? s(message, "message_text") : null,
    reportId: messageId ? (reports.get(messageId) ?? null) : null,
    duplicateOfAndroidMessage: Boolean(s(row, "duplicate_of_message_id")),
  };
}

const COLUMNS =
  "id,source,conversation_type,group_id,group_name,sender_id,sender_name,message_id,duplicate_of_message_id,media_kind,mime_type,original_file_name,stored_file_name,file_size_bytes,sha256,r2_key,media_status,media_status_reason,message_received_at,created_at,message:okb_bridge_messages(message_text)";

/** Android bridge files (migration 20261010_okb_bridge_media_items.sql), one row per message. */
const BRIDGE_VIEW = "okb_bridge_media_items";
const BRIDGE_COLUMNS =
  "media_id,message_fingerprint,linked_at,is_duplicate,message_id,platform,group_name,sender_name,message_text,message_timestamp,media_type,mime_type,original_file_name,file_size_bytes,sha256,object_key,storage";
/** Newest items merged from both sources; "Show more" stops after this many. */
const MAX_WINDOW = 1000;

const BRIDGE_KIND: Record<string, MediaKind> = {
  IMAGE: "image",
  VIDEO: "video",
  DOCUMENT: "document",
  AUDIO: "audio",
  STICKER: "sticker",
};

function bridgeItem(row: Row): CollectedMediaItem {
  const mediaId = s(row, "media_id") ?? "";
  const fingerprint = s(row, "message_fingerprint") ?? "";
  const key = s(row, "object_key");
  const stored = Boolean(key) && s(row, "storage") === "r2";
  const status: MediaStatus =
    row.is_duplicate === true ? "duplicate" : "stored";
  const size = row.file_size_bytes;
  return {
    id: `b-${mediaId}-${fingerprint.slice(0, 16)}`,
    fileRef: `b-${mediaId}`,
    channel: "android_bridge",
    source: s(row, "platform") === "viber" ? "viber" : "whatsapp",
    conversationType: "group",
    groupName: s(row, "group_name"),
    // Android notifications expose no platform ids.
    groupId: null,
    senderName: s(row, "sender_name"),
    senderId: null,
    receivedAt: s(row, "message_timestamp"),
    createdAt: s(row, "linked_at") ?? "",
    kind: BRIDGE_KIND[s(row, "media_type") ?? ""] ?? "other",
    mimeType: s(row, "mime_type"),
    fileName: s(row, "original_file_name"),
    fileSizeBytes: typeof size === "number" ? size : size ? Number(size) : null,
    sha256: s(row, "sha256"),
    status,
    statusReason: null,
    hasFile: stored,
    previewUrl: stored
      ? previewUrl({
          r2_key: key,
          mime_type: row.mime_type,
          media_status: status,
        })
      : null,
    reference: `okb-bridge-media:${mediaId}`,
    messageId: s(row, "message_id"),
    messageText: s(row, "message_text"),
    reportId: null,
    duplicateOfAndroidMessage: false,
  };
}

interface SourcePage {
  rows: Row[];
  total: number;
  /** False when the table/view does not exist (migration not applied). */
  present: boolean;
}

async function collectorPage(
  q: MediaListQuery,
  limit: number,
): Promise<SourcePage> {
  const p = new URLSearchParams({
    select: COLUMNS,
    order: "created_at.desc,id.desc",
    limit: String(limit),
  });
  // Only messages that carried an attachment belong on the media page.
  p.append("media_status", "not.in.(none,pending_upload)");
  if (q.source) p.append("source", `eq.${q.source}`);
  if (q.kind) p.append("media_kind", `eq.${q.kind}`);
  if (q.status) p.append("media_status", `eq.${q.status}`);
  if (q.group) p.append("group_name", `eq.${q.group}`);
  if (q.sender) p.append("sender_name", `ilike.${like(q.sender)}`);
  if (q.from) p.append("message_received_at", `gte.${q.from}`);
  if (q.to) p.append("message_received_at", `lt.${q.to}`);
  try {
    const r = await rest(TABLE, p, true);
    const rows = r.data as Row[];
    return { rows, total: r.total ?? rows.length, present: true };
  } catch (err) {
    if (err instanceof TableMissing)
      return { rows: [], total: 0, present: false };
    throw err;
  }
}

async function bridgePage(
  q: MediaListQuery,
  limit: number,
): Promise<SourcePage> {
  // The Android bridge only records files that are in R2: nothing to list for the other outcomes.
  if (q.status && q.status !== "stored" && q.status !== "duplicate")
    return { rows: [], total: 0, present: true };
  const p = new URLSearchParams({
    select: BRIDGE_COLUMNS,
    order: "linked_at.desc,media_id.desc",
    limit: String(limit),
  });
  if (q.source === "viber") p.append("platform", "eq.viber");
  if (q.source === "whatsapp") p.append("platform", "eq.whatsapp");
  if (q.kind) p.append("media_type", `eq.${q.kind.toUpperCase()}`);
  if (q.status) p.append("is_duplicate", `is.${q.status === "duplicate"}`);
  if (q.group) p.append("group_name", `eq.${q.group}`);
  if (q.sender) p.append("sender_name", `ilike.${like(q.sender)}`);
  if (q.from) p.append("message_timestamp", `gte.${q.from}`);
  if (q.to) p.append("message_timestamp", `lt.${q.to}`);
  try {
    const r = await rest(BRIDGE_VIEW, p, true);
    const rows = r.data as Row[];
    return { rows, total: r.total ?? rows.length, present: true };
  } catch (err) {
    if (err instanceof TableMissing)
      return { rows: [], total: 0, present: false };
    throw err;
  }
}

async function groupNames(table: string): Promise<string[]> {
  const gp = new URLSearchParams({
    select: "group_name",
    group_name: "not.is.null",
    order: "group_name.asc",
    limit: "1000",
  });
  return ((await rest(table, gp)).data as Row[])
    .map((r) => s(r, "group_name"))
    .filter(Boolean) as string[];
}

export async function listCollectedMedia(
  q: MediaListQuery,
): Promise<MediaListResult> {
  const offset = Math.max(0, q.offset ?? 0);
  const empty = (configured: boolean): MediaListResult => ({
    items: [],
    total: 0,
    offset,
    limit: PAGE,
    groups: [],
    configured,
  });
  // Both sources are ordered newest first; take enough of each to cut this page out of the merged list.
  const window = Math.min(offset + PAGE, MAX_WINDOW);
  if (offset >= window) return empty(true);
  const [collector, bridge] = await Promise.all([
    collectorPage(q, window),
    bridgePage(q, window),
  ]);
  if (!collector.present && !bridge.present) return empty(false);

  const reports = new Map<string, string>();
  const merged = [
    ...collector.rows.map((r) => toItem(r, reports)),
    ...bridge.rows.map(bridgeItem),
  ]
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    )
    .slice(offset, offset + PAGE);

  const ids = [
    ...new Set(merged.map((i) => i.messageId).filter(Boolean)),
  ] as string[];
  if (ids.length) {
    const rp = new URLSearchParams({
      select: "id,message_id",
      message_id: `in.(${ids.join(",")})`,
    });
    const { data } = await rest("okb_bridge_reports", rp);
    for (const r of data as Row[]) {
      const mid = s(r, "message_id");
      const rid = s(r, "id");
      if (mid && rid) reports.set(mid, rid);
    }
  }

  const groups = [
    ...new Set([
      ...(collector.present ? await groupNames(TABLE) : []),
      ...(bridge.present ? await groupNames(BRIDGE_VIEW) : []),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  return {
    items: merged.map((i) => ({
      ...i,
      reportId: i.messageId ? (reports.get(i.messageId) ?? null) : null,
    })),
    total: collector.total + bridge.total,
    offset,
    limit: PAGE,
    groups,
    configured: true,
  };
}

/** R2 key + filename of a collected file, or null when there is no stored file. */
export async function collectedFile(
  id: string,
): Promise<{ key: string; fileName: string; mimeType: string | null } | null> {
  if (id.startsWith("b-")) return bridgeFile(id.slice(2));
  const p = new URLSearchParams({
    select: "r2_key,original_file_name,stored_file_name,mime_type,media_status",
    id: `eq.${id}`,
    limit: "1",
  });
  const rows = (await rest(TABLE, p)).data as Row[];
  const row = rows[0];
  const key = row ? s(row, "r2_key") : null;
  const status = row ? s(row, "media_status") : null;
  if (!row || !key || (status !== "stored" && status !== "duplicate"))
    return null;
  return {
    key,
    fileName:
      s(row, "original_file_name") ??
      s(row, "stored_file_name") ??
      key.split("/").pop() ??
      "file",
    mimeType: s(row, "mime_type"),
  };
}

/** A file uploaded by the Android bridge (okb_bridge_media), only when it is recorded as stored in R2. */
async function bridgeFile(
  mediaId: string,
): Promise<{ key: string; fileName: string; mimeType: string | null } | null> {
  const p = new URLSearchParams({
    select: "object_key,original_file_name,mime_type,storage,completed",
    id: `eq.${mediaId}`,
    limit: "1",
  });
  const row = ((await rest("okb_bridge_media", p)).data as Row[])[0];
  const key = row ? s(row, "object_key") : null;
  if (!row || !key || s(row, "storage") !== "r2" || row.completed !== true)
    return null;
  return {
    key,
    fileName: s(row, "original_file_name") ?? key.split("/").pop() ?? "file",
    mimeType: s(row, "mime_type"),
  };
}
