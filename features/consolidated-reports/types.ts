/**
 * Automated consolidated WhatsApp reports. Generated and stored by the OKB Bridge backend
 * (okb-bridge-cloud-backend, lib/consolidated); the Command Center only configures them and shows history.
 */

/** Preset daily cut-offs; any other "HH:MM" (24-hour, Asia/Manila) can be added as a custom time. */
export const SCHEDULE_TIMES = ["06:00", "18:00", "00:00"] as const;
/** A daily cut-off "HH:MM", 24-hour, Asia/Manila. */
export type ScheduleTime = string;
export const MAX_SCHEDULE_TIMES = 24;
export const SCHEDULE_TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const REPORT_INTERVALS = [15, 30, 60, 120] as const;
export type ReportInterval = (typeof REPORT_INTERVALS)[number];

export interface ConsolidatedSettings {
  enabled: boolean;
  scheduleTimes: ScheduleTime[];
  intervalMinutes: ReportInterval | null;
  sendOnlyIfReports: boolean;
  /**
   * WhatsApp group consolidated reports go to: the TEXT report is sent there automatically by the OKB Bridge
   * phone; the PDF is sent there manually by the operator. Required to enable automated reports.
   */
  destinationGroup: string;
  timezone: "Asia/Manila";
  enabledAt: string | null;
  /** Last time the OKB Bridge phone checked in (every ~15 minutes). */
  lastDeviceCheckAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export type ConsolidatedSettingsInput = Pick<
  ConsolidatedSettings,
  "enabled" | "scheduleTimes" | "intervalMinutes" | "sendOnlyIfReports" | "destinationGroup"
>;

/**
 * Legacy PDF status (older backends): pending: waiting for the bridge phone · notified: on the phone ·
 * opened: share screen opened · sent: operator confirmed · failed: could not reach the phone.
 */
export type WhatsAppStatus = "pending" | "notified" | "opened" | "sent" | "failed";

/** TEXT (automatic): scheduled → sending → sent | failed (retried with backoff until the attempts run out). */
export type TextDeliveryStatus = "scheduled" | "sending" | "sent" | "failed";
/** PDF (manual): ready → notified (on the phone) → opened (share screen) → sent (operator confirmed) | failed. */
export type PdfDeliveryStatus = "ready" | "notified" | "opened" | "sent" | "failed";

interface DeliveryBase {
  id: string;
  destinationGroup: string | null;
  deviceId: string | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  notifiedAt: string | null;
  openedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
}

/** The consolidated TEXT report, sent automatically to the destination group by the bridge phone. */
export interface TextDelivery extends DeliveryBase {
  deliveryType: "TEXT";
  status: TextDeliveryStatus;
  maxAttempts: number;
  nextAttemptAt: string | null;
  partCount: number;
  /** Reference printed in the WhatsApp message, e.g. "OKB-1A2B3C4D". */
  ref: string | null;
  /** How the phone confirmed the message in the chat. */
  verification: string | null;
}

/** The consolidated PDF, sent manually by the operator from the bridge phone. */
export interface PdfDelivery extends DeliveryBase {
  deliveryType: "PDF";
  status: PdfDeliveryStatus;
}

export interface ConsolidatedReport {
  id: string;
  kind: "scheduled" | "test";
  periodStart: string;
  periodEnd: string;
  reportCount: number;
  fileName: string;
  fileSizeBytes: number | null;
  pdfStatus: "generated" | "failed";
  whatsappStatus: WhatsAppStatus;
  destinationGroup: string | null;
  generatedAt: string;
  notifiedAt: string | null;
  /** When the operator opened WhatsApp's share screen from the phone notification (not proof of sending). */
  openedAt: string | null;
  createdBy: string | null;
  /** Absent from older backends, which only know the PDF ([whatsappStatus]). */
  textDelivery?: TextDelivery | null;
  pdfDelivery?: PdfDelivery | null;
}
