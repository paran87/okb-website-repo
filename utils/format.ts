import { formatDistanceToNowStrict } from "date-fns";

/** Format a coordinate pair for dense command-center display. */
export function formatCoordinates(lng: number, lat: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/** Human-friendly relative time, e.g. "3 minutes ago". */
export function formatRelativeTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return `${formatDistanceToNowStrict(value)} ago`;
}

/** Format a number with thousands separators. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

/** Format a timestamp in 24h Philippine time for logs and headers. */
export function formatTimestamp(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
    timeZone: "Asia/Manila",
  }).format(value);
}
