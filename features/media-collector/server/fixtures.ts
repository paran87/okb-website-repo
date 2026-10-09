import "server-only";
import type {
  CollectedMediaItem,
  CollectorStatus,
  MediaListQuery,
  MediaListResult,
} from "@/features/media-collector/types";

/**
 * DEVELOPMENT ONLY (OKB_REPORTS_DEV_FIXTURES=1, never in production builds): example items so the Media page can
 * be checked locally without Supabase. Shown under the same "DEVELOPMENT FIXTURES" banner as the reports.
 */

const base = {
  conversationType: "group" as const,
  groupId: "120363025555555555@g.us",
  senderId: "639170000001",
  sha256: "4f2c0c6d8c1b1e0d6a8f0e2b9c3d7a1e5f6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
  messageId: "00000000-0000-4000-8000-000000000001",
  reportId: null,
  duplicateOfAndroidMessage: false,
  statusReason: null,
};

const ITEMS: CollectedMediaItem[] = [
  {
    ...base,
    id: "f1",
    source: "whatsapp",
    groupName: "OKB NCR Flood Reports",
    senderName: "MM3DEO",
    receivedAt: "2026-10-09T14:42:00Z",
    createdAt: "2026-10-09T14:42:05Z",
    kind: "image",
    mimeType: "image/webp",
    fileName: "IMG-20261009-WA0012.jpg",
    fileSizeBytes: 482113,
    status: "stored",
    hasFile: true,
    previewUrl: "/photos/aerial-river-dredging.webp",
    reference: "okb-media:f1",
    messageText:
      "España Blvd cor. Blumentritt — gutter deep, passable to light vehicles. Photo attached.",
  },
  {
    ...base,
    id: "f2",
    source: "whatsapp",
    groupName: "OKB NCR Flood Reports",
    senderName: "Quezon City 1st DEO",
    receivedAt: "2026-10-09T13:10:00Z",
    createdAt: "2026-10-09T13:10:04Z",
    kind: "document",
    mimeType: "application/pdf",
    fileName: "QC 1st DEO Flood Situation Report 1300H.pdf",
    fileSizeBytes: 1934002,
    status: "stored",
    hasFile: true,
    previewUrl: null,
    reference: "okb-media:f2",
    messageText: null,
  },
  {
    ...base,
    id: "f3",
    source: "viber",
    conversationType: "direct",
    groupId: null,
    groupName: null,
    senderName: "Viber Reporter",
    receivedAt: "2026-10-09T12:55:00Z",
    createdAt: "2026-10-09T12:55:03Z",
    kind: "image",
    mimeType: "image/webp",
    fileName: null,
    fileSizeBytes: 220311,
    status: "duplicate",
    hasFile: true,
    previewUrl: "/photos/amphibious-excavator.webp",
    reference: "okb-media:f3",
    messageText: "Same photo as earlier, Araneta Ave.",
    duplicateOfAndroidMessage: true,
  },
  {
    ...base,
    id: "f4",
    source: "whatsapp",
    groupName: "OKB NCR Flood Reports",
    senderName: "MM2DEO",
    receivedAt: "2026-10-09T12:20:00Z",
    createdAt: "2026-10-09T12:20:09Z",
    kind: "video",
    mimeType: null,
    fileName: null,
    fileSizeBytes: null,
    status: "media_unavailable",
    statusReason:
      "platform did not provide the file (media_expired_or_unknown)",
    hasFile: false,
    previewUrl: null,
    reference: "okb-media:f4",
    messageText: "Video of the underpass",
  },
  {
    ...base,
    id: "f5",
    source: "whatsapp",
    groupName: "OKB NCR Flood Reports",
    senderName: "MM3DEO",
    receivedAt: "2026-10-09T11:02:00Z",
    createdAt: "2026-10-09T11:02:02Z",
    kind: "document",
    mimeType: "application/pdf",
    fileName: "report.pdf",
    fileSizeBytes: 1024,
    status: "rejected",
    statusReason: "unsupported_or_unrecognized_type",
    hasFile: false,
    previewUrl: null,
    reference: "okb-media:f5",
    messageText: null,
  },
];

export function fixtureMedia(q: MediaListQuery): MediaListResult {
  const items = ITEMS.filter(
    (i) =>
      (!q.source || i.source === q.source) &&
      (!q.kind || i.kind === q.kind) &&
      (!q.status || i.status === q.status) &&
      (!q.group || i.groupName === q.group) &&
      (!q.sender ||
        (i.senderName ?? "").toLowerCase().includes(q.sender.toLowerCase())),
  );
  return {
    items,
    total: items.length,
    offset: 0,
    limit: 24,
    groups: ["OKB NCR Flood Reports"],
    configured: true,
  };
}

export function fixtureStatus(): CollectorStatus {
  const platform = (
    enabled: boolean,
    status: "connected" | "disabled",
    groups: number,
    senders: number,
    viber = false,
  ) => ({
    enabled,
    mode: "official",
    status,
    detail: null,
    paused: false,
    lastWebhookAt: "2026-10-09T14:42:00Z",
    allowlist: { groups, senders },
    groupCapture: viber
      ? { status: "unsupported", code: "VIBER_MEDIA_CAPTURE_UNSUPPORTED" }
      : {
          status: "limited",
          code: "OFFICIAL_WHATSAPP_MEDIA_CAPTURE_LIMITATION",
        },
  });
  return {
    available: true,
    unavailableReason: null,
    settings: {
      whatsappPaused: false,
      viberPaused: false,
      updatedAt: null,
      updatedBy: null,
    },
    collectors: [
      {
        collectorId: "okb-media-collector",
        reportedAt: new Date(Date.now() - 40_000).toISOString(),
        snapshot: {
          status: "ok",
          version: "1.0.0",
          uptime: 86400,
          whatsapp: platform(true, "connected", 1, 12),
          viber: platform(true, "connected", 0, 4, true),
          r2: { status: "connected", lastUploadAt: "2026-10-09T14:42:04Z" },
          okbBackend: {
            status: "connected",
            lastSuccessAt: new Date().toISOString(),
          },
          queue: { pending: 0, failed: 0, diskBytes: 0 },
          limits: { maxImageMb: 25, maxDocumentMb: 50, maxVideoMb: 200 },
        },
      },
    ],
  };
}
