/** Number formats of the accomplishment infographic (the same as the dashboard's). */

export const int = (n: number) => Math.round(n).toLocaleString("en-US");

/** "1.2M", "345K", "12,345". */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  return int(n);
}

/** "42%", "0.7%" (one decimal under 10%), "—". */
export function pct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n > 0 && n < 10) return `${(Math.round(n * 10) / 10).toString()}%`;
  return `${Math.round(n)}%`;
}

/** "12.4 km", "850 m". */
export const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 100_000 ? 0 : 1)} km` : `${int(m)} m`);

/** "November 21, 2026" in Manila. */
export function manilaDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" });
}

/** "4:32 PM" in Manila. */
export function manilaTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
}

/** "Nov 18" from "2026-11-18". */
export function shortDay(day: string | null): string {
  if (!day) return "";
  const d = new Date(`${day}T00:00:00+08:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
}
