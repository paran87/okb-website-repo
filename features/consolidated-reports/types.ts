/**
 * Automated consolidated WhatsApp reports. Generated and stored by the OKB Bridge backend
 * (okb-bridge-cloud-backend, lib/consolidated); the Command Center only configures them and shows history.
 */

export const SCHEDULE_TIMES = ["06:00", "18:00", "00:00"] as const;
export type ScheduleTime = (typeof SCHEDULE_TIMES)[number];
export const REPORT_INTERVALS = [15, 30, 60, 120] as const;
export type ReportInterval = (typeof REPORT_INTERVALS)[number];

export interface ConsolidatedSettings {
  enabled: boolean;
  scheduleTimes: ScheduleTime[];
  intervalMinutes: ReportInterval | null;
  sendOnlyIfReports: boolean;
  /**
   * WhatsApp group the operator selects in WhatsApp's share screen. Shown as an instruction only: neither the
   * backend nor the phone selects it automatically. Empty = not configured.
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
 * pending: ready to send, waiting for the bridge phone · notified: ready to send, notification on the phone ·
 * opened: the operator opened WhatsApp's share screen. Android cannot observe whether Send was pressed, so
 * there is no "sent" status.
 */
export type WhatsAppStatus = "pending" | "notified" | "opened";

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
}
