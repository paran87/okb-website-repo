/**
 * Media shown in the Command Center: files from the OKB Media Collector (okb_ingested_media + collector status) and
 * files uploaded by the Android bridge (okb_bridge_media_items view).
 */

export type MediaSource = "whatsapp" | "viber";
export type MediaStatus =
  | "none"
  | "pending_upload"
  | "stored"
  | "duplicate"
  | "media_unavailable"
  | "rejected"
  | "not_collected";
export type MediaKind =
  "image" | "video" | "document" | "audio" | "sticker" | "other";

/** Which OKB component captured the file. */
export type MediaChannel = "collector" | "android_bridge";

export interface CollectedMediaItem {
  /** Unique per listed item (an Android-bridge photo sent in two messages is two items). */
  id: string;
  /** Path segment for /api/media-collector/[ref]/file when it differs from id (Android bridge: "b-<media id>"). */
  fileRef?: string;
  channel: MediaChannel;
  source: MediaSource;
  conversationType: "group" | "direct";
  groupName: string | null;
  groupId: string | null;
  senderName: string | null;
  senderId: string | null;
  /** Message time on the platform. */
  receivedAt: string | null;
  /** When the collector registered it. */
  createdAt: string;
  kind: MediaKind | null;
  mimeType: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  sha256: string | null;
  status: MediaStatus;
  statusReason: string | null;
  /** True when the original file is in R2 and can be viewed/downloaded through a signed link. */
  hasFile: boolean;
  /** Short-lived signed preview link (images only). */
  previewUrl: string | null;
  /** Stable reference for copying: "okb-media:<id>". */
  reference: string;
  messageId: string | null;
  messageText: string | null;
  reportId: string | null;
  duplicateOfAndroidMessage: boolean;
}

export interface MediaListQuery {
  source?: MediaSource;
  kind?: "image" | "video" | "document";
  status?: MediaStatus;
  group?: string;
  sender?: string;
  from?: string;
  to?: string;
  offset?: number;
}

export interface MediaListResult {
  items: CollectedMediaItem[];
  total: number | null;
  offset: number;
  limit: number;
  /** Group names seen so far (filter options). */
  groups: string[];
  /** False when neither the collector tables nor the Android-bridge media view exist yet. */
  configured: boolean;
}

export type PlatformStatus =
  | "disabled"
  | "unknown"
  | "connected"
  | "auth_error"
  | "unreachable"
  | "error"
  | "paused";

export interface CollectorPlatformSnapshot {
  enabled: boolean;
  mode: string;
  status: PlatformStatus;
  detail: string | null;
  paused: boolean;
  lastWebhookAt: string | null;
  allowlist: { groups: number; senders: number };
  groupCapture: { status: string; code: string };
}

export interface CollectorSnapshot {
  status: "ok" | "degraded";
  version: string;
  uptime: number;
  whatsapp: CollectorPlatformSnapshot;
  viber: CollectorPlatformSnapshot;
  r2: { status: string; lastUploadAt: string | null };
  okbBackend: { status: string; lastSuccessAt: string | null };
  queue: { pending: number; failed: number; diskBytes: number };
  limits: { maxImageMb: number; maxDocumentMb: number; maxVideoMb: number };
}

export interface CollectorStatus {
  available: boolean;
  unavailableReason: string | null;
  settings: {
    whatsappPaused: boolean;
    viberPaused: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  collectors: {
    collectorId: string;
    reportedAt: string;
    snapshot: CollectorSnapshot;
  }[];
}
