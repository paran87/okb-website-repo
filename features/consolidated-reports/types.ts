/**
 * Automated consolidated WhatsApp reports. Generated and stored by the OKB Bridge backend
 * (okb-bridge-cloud-backend, lib/consolidated); the Command Center configures them, keeps the report schedule
 * and shows history.
 */

export interface ConsolidatedSettings {
  enabled: boolean;
  sendOnlyIfReports: boolean;
  /**
   * WhatsApp group consolidated reports go to: the TEXT and PDF reports are sent there automatically by the OKB
   * Bridge phone (the operator sends a PDF the phone could not). Read-only: it is set only on the bridge phone
   * (Settings → WhatsApp Report Groups), so there is one place to change it. Empty until a phone has set it.
   */
  destinationGroup: string;
  timezone: "Asia/Manila";
  enabledAt: string | null;
  /** Last time the OKB Bridge phone checked in (every ~30 seconds while monitoring; older apps: 15 minutes). */
  lastDeviceCheckAt: string | null;
  /**
   * Last quick 30-second check by the phone (app 1.4.0+). Null: the phone does not run it (older app, or not
   * since the backend restarted). Absent on older backends.
   */
  lastDevicePollAt?: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Reporting period of a TEST REPORT (ISO). Without it the backend uses the last 24 hours. */
export interface TestPeriod {
  periodStart?: string;
  periodEnd?: string;
}

/** Longest test reporting period the backend accepts. */
export const MAX_TEST_PERIOD_DAYS = 31;

export type ConsolidatedSettingsInput = Pick<ConsolidatedSettings, "enabled" | "sendOnlyIfReports">;

/**
 * One entry of the report schedule: the flood reports received in the MONITORING PERIOD
 * [periodStart, periodEnd) are put into one consolidated report at the DATE OF SENDING (sendAt), and the
 * bridge phone sends its TEXT to the destination group automatically.
 *   pending     waiting for its date of sending (or for the bridge phone's next check)
 *   generated   the report was prepared: [report].textDelivery has Sent / Failed / retrying
 *   no_reports  nothing was received in the period, so nothing was sent
 *   missed      not prepared within 24 hours of its date of sending (e.g. the bridge phone was offline)
 */
export type ScheduleStatus = "pending" | "generated" | "no_reports" | "missed";

/**
 * How an entry is sent: TEXT = the consolidated text automatically to the destination group (no PDF goes to
 * the phone); PDF = the PDF to the bridge phone ("PDF Ready", sent by the operator), no automatic text.
 */
export type ScheduleDeliveryType = "TEXT" | "PDF";

export interface ScheduleEntry {
  id: string;
  periodStart: string;
  periodEnd: string;
  sendAt: string;
  deliveryType: ScheduleDeliveryType;
  status: ScheduleStatus;
  reportId: string | null;
  report: ConsolidatedReport | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Times of a schedule entry (ISO, UTC). */
export interface ScheduleInput {
  periodStart: string;
  periodEnd: string;
  sendAt: string;
  deliveryType: ScheduleDeliveryType;
}

/** Longest monitoring period the backend accepts. */
export const MAX_SCHEDULE_PERIOD_DAYS = 31;

/**
 * Legacy PDF status (older backends): pending: waiting for the bridge phone · notified: on the phone ·
 * opened: share screen opened · sent: sent by the phone or operator confirmed · failed: could not reach the phone.
 */
export type WhatsAppStatus = "pending" | "notified" | "opened" | "sent" | "failed";

/** TEXT (automatic): scheduled → sending → sent | failed (retried with backoff until the attempts run out). */
export type TextDeliveryStatus = "scheduled" | "sending" | "sent" | "failed";
/**
 * PDF: ready → notified (on the phone, sent automatically from there; errorMessage says why it needs the operator)
 * → [opened (share screen)] → sent (by the phone, or operator confirmed) | failed.
 */
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
  /** Failed because an operator cancelled it in the Command Center (older backends: absent). */
  cancelled?: boolean;
}

/** The consolidated PDF, sent automatically by the bridge phone (or by the operator when it could not). */
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
