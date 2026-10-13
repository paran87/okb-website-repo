/** Display helpers for the Admin page (Philippine time). */

const TZ = "Asia/Manila";

const NUMBER = new Intl.NumberFormat("en-PH");
const DATE = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
const SHORT_DATE = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric" });
const LONG_DATE = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const HOUR = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", hour: "numeric", hour12: true });

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

/** "Tue, Oct 14, 2026" in Philippine time. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** "8:42:11 PM" in Philippine time. */
export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Bucket labels arrive as Philippine local time without a zone; read them as UTC to keep the wall clock. */
function local(t: string): Date {
  return new Date(`${t.slice(0, 19)}Z`);
}

export function bucketTick(t: string, bucket: "hour" | "day"): string {
  return bucket === "hour" ? HOUR.format(local(t)) : SHORT_DATE.format(local(t));
}

export function bucketLabel(t: string, bucket: "hour" | "day"): string {
  const d = local(t);
  if (bucket === "day") return LONG_DATE.format(d);
  const next = new Date(d.getTime() + 60 * 60 * 1000);
  return `${HOUR.format(d)} – ${HOUR.format(next)}`;
}

export function hourLabel(hour: number): string {
  return HOUR.format(new Date(Date.UTC(2026, 0, 1, hour)));
}

export function countryName(code: string | null): string {
  if (!code) return "Unknown";
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code: string | null): string {
  if (!code || !/^[a-z]{2}$/i.test(code)) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function areaLabel(area: string): string {
  return area === "command" ? "Command Center" : area === "website" ? "OKB Website" : area || "Unknown";
}

export function capitalize(value: string | null): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
