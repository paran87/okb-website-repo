import { manilaDayKey, manilaDayStart } from "@/features/reports/lib/format";

/**
 * The four monitoring periods of a monitoring day (Asia/Manila). A monitoring day runs from 6:00 AM to 6:00 AM, so
 * "12:00 AM – 6:00 AM" of October 8 is the early morning of October 9, the last period of October 8's schedule.
 */
export const MONITORING_PERIODS = [
  { id: "am", label: "6:00 AM – 12:00 PM", short: "6AM–12PM", startHour: 6 },
  { id: "pm", label: "12:00 PM – 6:00 PM", short: "12PM–6PM", startHour: 12 },
  { id: "eve", label: "6:00 PM – 12:00 AM", short: "6PM–12AM", startHour: 18 },
  { id: "night", label: "12:00 AM – 6:00 AM", short: "12AM–6AM", startHour: 24 },
] as const;

export type MonitoringPeriodId = (typeof MONITORING_PERIODS)[number]["id"];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const isMonitoringPeriod = (v: unknown): v is MonitoringPeriodId =>
  MONITORING_PERIODS.some((p) => p.id === v);

/** [from, to) of a period of the monitoring day [day] ("YYYY-MM-DD"), or null for an invalid day. */
export function monitoringPeriodRange(day: string, period: MonitoringPeriodId): { from: Date; to: Date } | null {
  const start = manilaDayStart(day);
  const p = MONITORING_PERIODS.find((x) => x.id === period);
  if (!start || !p) return null;
  const from = new Date(start.getTime() + p.startHour * HOUR_MS);
  return { from, to: new Date(from.getTime() + 6 * HOUR_MS) };
}

/** The monitoring day and period an instant falls in (before 6:00 AM belongs to the previous day). */
export function currentMonitoringPeriod(at: Date = new Date()): { day: string; period: MonitoringPeriodId } {
  const shifted = new Date(at.getTime() - 6 * HOUR_MS);
  const day = manilaDayKey(shifted);
  const hour = Math.floor(((at.getTime() + 8 * HOUR_MS) % DAY_MS) / HOUR_MS);
  const period: MonitoringPeriodId = hour < 6 ? "night" : hour < 12 ? "am" : hour < 18 ? "pm" : "eve";
  return { day, period };
}

export const monitoringPeriodLabel = (period: MonitoringPeriodId) =>
  MONITORING_PERIODS.find((p) => p.id === period)?.label ?? "";
