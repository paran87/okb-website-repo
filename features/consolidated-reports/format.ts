/** Asia/Manila display helpers (same wording as the PDF and the WhatsApp caption). */

const TZ = "Asia/Manila";
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true });
const shortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
});
const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = 8 * 60 * 60 * 1000;

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatShort = (iso: string | null) => (iso ? shortFmt.format(new Date(iso)) : "—");

/** "August 12, 2026" + "06:00 AM – 12:00 PM"; a period ending at the next midnight keeps the start date. */
export function periodText(startIso: string, endIso: string): { date: string; time: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startMidnight = Math.floor((start.getTime() + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;
  if (formatDate(startIso) === formatDate(endIso) || end.getTime() === startMidnight + DAY_MS) {
    return { date: formatDate(startIso), time: `${formatTime(startIso)} – ${formatTime(endIso)}` };
  }
  return { date: formatDate(endIso), time: `${formatShort(startIso)} – ${formatShort(endIso)}` };
}

export const SCHEDULE_LABELS: Record<string, string> = { "06:00": "6:00 AM", "18:00": "6:00 PM", "00:00": "12:00 AM" };
