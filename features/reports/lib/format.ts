/**
 * Time formatting for reports. Everything is shown in Philippine time
 * (Asia/Manila, UTC+8, no DST) so the server and every browser agree.
 */

export const REPORT_TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Oct 5, 2026 • 2:35 AM" */
export function formatDateTime(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "Not reported";
  return `${dateFormat.format(d)} • ${timeFormat.format(d)}`;
}

/** "Oct 5, 2026" */
export function formatDate(iso: string | null | undefined): string {
  const d = toDate(iso);
  return d ? dateFormat.format(d) : "Not reported";
}

/** "Oct 5 • 2:07 AM" — compact, for timelines. */
export function formatShortDateTime(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "Not reported";
  return `${shortDateFormat.format(d)} • ${timeFormat.format(d)}`;
}

/** Full date-time string for tooltips. */
export function formatFull(iso: string | null | undefined): string {
  const d = toDate(iso);
  return d ? `${dateTimeFormat.format(d)} (PHT)` : "Not reported";
}

/** "01:34" (HH:mm from the extraction) → "1:34 AM". */
export function formatClock(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** "2h 22m" between two instants (absolute). */
export function formatGap(fromIso: string | null, toIso: string | null): string | null {
  const a = toDate(fromIso);
  const b = toDate(toIso);
  if (!a || !b) return null;
  const minutes = Math.round(Math.abs(b.getTime() - a.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 48) return m ? `${h}h ${m}m` : `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  const d = toDate(iso);
  if (!d) return "";
  const diff = now - d.getTime();
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Manila calendar day "YYYY-MM-DD" for an instant. */
export function manilaDayKey(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  return new Date(t + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of the Manila calendar day containing `at`, as a UTC instant. */
export function startOfManilaDay(at: Date): Date {
  const local = at.getTime() + MANILA_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - MANILA_OFFSET_MS);
}

/** "2026-10-05" (Manila) → UTC instant of that day's 00:00 PHT. */
export function manilaDayStart(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00+08:00`);
  return Number.isNaN(t) ? null : new Date(t);
}

export function formatMeters(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(2)} m`;
}

/**
 * Human reference for a report: RPT-YYYYMMDD-XXXXXX (Manila date the bridge
 * received it + first 6 hex of the UUID). The UUID remains the true id.
 */
export function reportReference(id: string, createdAt: string): string {
  const day = createdAt ? manilaDayKey(createdAt).replaceAll("-", "") : "00000000";
  return `RPT-${day}-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

/** Parses a typed RPT reference back to its UUID prefix. */
export function parseReportReference(text: string): string | null {
  const m = /^RPT-\d{8}-([0-9A-F]{6})$/i.exec(text.trim());
  return m?.[1] ? m[1].toLowerCase() : null;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
