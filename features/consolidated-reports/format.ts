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

/** Value for an <input type="datetime-local"> showing [date] in Asia/Manila, e.g. "2026-10-07T06:00". */
export function manilaInputValue(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-10-07T06:00" (Asia/Manila, no daylight saving) → ISO in UTC; null when incomplete. */
export function manilaInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}:00+08:00`);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** "07:30" → "7:30 AM", "00:00" → "12:00 AM", "18:05" → "6:05 PM". */
export function timeLabel(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
