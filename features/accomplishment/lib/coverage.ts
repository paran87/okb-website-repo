/**
 * Program coverage (where Oplan Kontra Baha works) from the accomplishment data of the OKB SSOT sheet: every region
 * with its sites (province / city) and their waterways and drainage lines, the names written for reading.
 */
import { regionLabel, regionToken, sortRegions } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData } from "@/features/accomplishment/types";
import { coverageTotals, type Coverage, type CoverageArea, type CoverageRegion } from "@/lib/config/okb-coverage";

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10 };
const SMALL = new Set(["DE", "DEL", "DELA", "NG", "NI", "NA", "SA", "AND", "OF", "TO", "VIA", "ALONG", "THE"]);
const UPPER = new Set([
  "NCR", "CAR", "NIR", "BARMM", "DPWH", "DEO", "NB", "SB", "SSH", "PNHS", "SM", "CDO", "BCIR", "EDSA", "UN", "JY", "ISF",
]);
/** Syllables after a hyphen that stay lower case: "Sum-ag", "Bitan-ag", "Law-an". */
const SUFFIX = new Set(["AG", "AN", "ON", "AY"]);
const NUMERAL = /^(?:XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)$/;

/** "IV-A" → "4a", "XIII" → "13": the anchor ids the website has always used (#coverage-r4a). */
function regionId(token: string): string {
  const [numeral, suffix = ""] = token.split("-");
  if (!numeral || !NUMERAL.test(numeral)) return token.toLowerCase().replace(/[^a-z0-9]+/g, "");
  let n = 0;
  for (let i = 0; i < numeral.length; i++) {
    const v = ROMAN[numeral[i]!]!;
    const next = ROMAN[numeral[i + 1] ?? ""] ?? 0;
    n += v < next ? -v : v;
  }
  return `r${n}${suffix.toLowerCase()}`;
}

/** One word of an upper-case sheet name, in title case (initials, numerals and acronyms stay upper case). */
function word(w: string, first: boolean, afterHyphen: boolean): string {
  if (/\d/.test(w)) return /^\d+(ST|ND|RD|TH)$/.test(w) ? w.toLowerCase() : w;
  if (w.length === 1 || NUMERAL.test(w) || UPPER.has(w)) return w;
  if (!first && SMALL.has(w)) return w.toLowerCase();
  if (afterHyphen && SUFFIX.has(w)) return w.toLowerCase();
  return w[0] + w.slice(1).toLowerCase();
}

/** "DRAINAGE SYSTEM ALONG LACSON ST." → "Lacson St."; "ROXAS, CAPIZ" → "Roxas, Capiz". Mixed-case names stay. */
export function readableName(raw: string, drainage = false): string {
  let name = raw.trim().replace(/\s+/g, " ");
  if (drainage) name = name.replace(/^DRAINAGE (?:SYSTEMS? |LATERALS )?(?:ALONG )?(?=\S)/i, "");
  if (/[a-z]/.test(name)) return name;
  let index = 0;
  return name.replace(/[A-Z0-9À-ɏ]+/gi, (w, offset: number) => {
    const out = word(w.toUpperCase(), index === 0, name[offset - 1] === "-");
    index++;
    return out;
  });
}

/** Regions, sites, waterways and drainage lines of the accomplishment data (ISF records are not places of work). */
export function buildCoverage(data: AccomplishmentData): Coverage {
  const regions: CoverageRegion[] = [];
  for (const r of sortRegions(data.regions)) {
    if (!r.a && /^unassigned$/i.test(r.n)) continue;
    const label = regionLabel(r);
    const areas: CoverageArea[] = [];
    for (const site of r.s) {
      const waterways = site.w.filter((w) => !w.i && !w.d).map((w) => readableName(w.n));
      const drainage = site.w.filter((w) => !w.i && w.d).map((w) => readableName(w.n, true));
      if (!waterways.length && !drainage.length) continue;
      areas.push({
        name: readableName(site.n),
        ...(waterways.length ? { waterways } : {}),
        ...(drainage.length ? { drainage } : {}),
      });
    }
    if (!areas.length) continue;
    const name = r.n
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/^region\s+[ivx]+(?:-[ab])?\s*[-–—:]\s*/i, "")
      .trim();
    regions.push({ id: regionId(regionToken(r)), code: label.code, name: name || label.name || label.code, areas });
  }
  const asOf = new Date(data.generatedAt).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return { regions, totals: coverageTotals(regions), asOf, live: true };
}
