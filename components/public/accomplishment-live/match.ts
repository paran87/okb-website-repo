import { regionLabel, visibleTree, DEFAULT_PREFS } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData } from "@/features/accomplishment/types";
import type { Selection } from "@/components/public/accomplishment-live/regions";

/** Every record of the dashboard with its region code and site (all record types). */
export function locateAll(data: AccomplishmentData): Selection[] {
  return visibleTree(data, { ...DEFAULT_PREFS, types: ["waterway", "drainage", "isf"], filter: "all" }, "").flatMap((r) =>
    r.sites.flatMap((s) => s.w.map((w) => ({ record: w, region: regionLabel(r).code, site: s.n }))),
  );
}

/** Words that say what kind of thing a name is rather than which one it is. */
const STOP = new Set(["ALONG", "THE", "OF", "AND", "DE", "DEL", "DRAINAGE", "SYSTEM", "DECLOGGING", "CLEANING", "OF", "IN", "AT", "TO", "COR", "CITY", "BRGY", "ST"]);

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[‐-―]/g, "-");
const squash = (s: string) => fold(s).replace(/[^A-Z0-9]+/g, "");
const words = (s: string) =>
  fold(s)
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

/**
 * The dashboard record a coverage name refers to: the same name ignoring case, accents and punctuation; else one
 * name containing the other; else the best word overlap. Records in the same region and of the same kind
 * (waterway or drainage) win.
 */
export function matchRecord(name: string, regionCode: string, records: Selection[], kind?: "waterway" | "drainage"): Selection | null {
  const target = squash(name);
  const targetWords = new Set(words(name));
  let best: { sel: Selection; score: number } | null = null;
  for (const sel of records) {
    const candidate = squash(sel.record.n);
    let score = 0;
    if (candidate === target) score = 100;
    else if (target.length >= 6 && candidate.length >= 6 && (candidate.includes(target) || target.includes(candidate))) score = 80;
    else if (targetWords.size) {
      const cw = new Set(words(sel.record.n));
      let shared = 0;
      for (const t of targetWords) if (cw.has(t)) shared++;
      const union = new Set([...targetWords, ...cw]).size;
      score = union ? (70 * shared) / union : 0;
    }
    if (score <= 0) continue;
    if (sel.region === regionCode) score += 15;
    // A drainage line is not the creek it drains into.
    if (kind && (kind === "drainage") !== sel.record.d) score -= 40;
    if (!best || score > best.score) best = { sel, score };
  }
  return best && best.score >= 45 ? best.sel : null;
}
