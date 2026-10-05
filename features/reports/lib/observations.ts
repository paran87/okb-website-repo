/**
 * Deterministic, explainable observations derived from AI-extracted report
 * data. Nothing here invents information:
 *
 * - A water level is only ever a value the extraction normalized from source
 *   text that stated a measurement ("0.20m"). Descriptions ("knee-deep") stay
 *   text; they are never converted to meters.
 * - "No flooding" is its own condition and is NEVER represented as 0.00 m.
 * - A location whose flood status the report does not state is "unknown".
 */
import type {
  BridgeReportRecord,
  ExtractedField,
  ExtractedLocation,
  FloodCondition,
  FloodMetrics,
  LocationObservation,
  WeatherObservation,
} from "@/features/reports/types";
import { formatClock, formatMeters } from "@/features/reports/lib/format";

/** A field's usable text value (provided only). */
export function provided<T>(field: ExtractedField<T> | null | undefined): T | null {
  if (!field || field.status !== "provided") return null;
  return field.value ?? null;
}

function providedText(field: ExtractedField | null | undefined): string | null {
  const v = provided(field);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Any source text the report carries for a field (provided or ambiguous). */
function sourceText(field: ExtractedField<unknown> | null | undefined): string | null {
  if (!field) return null;
  if (field.status === "missing") return null;
  return typeof field.raw === "string" && field.raw.trim() ? field.raw.trim() : null;
}

// ---------------------------------------------------------------------------
// Location identity
// ---------------------------------------------------------------------------

const WORD_ABBREVIATIONS: [RegExp, string][] = [
  [/\b(corner|cor|crnr|kanto)\b/g, " cor "],
  [/\b(street|st)\b/g, " st "],
  [/\b(avenue|ave|av)\b/g, " ave "],
  [/\b(boulevard|blvd|bvd)\b/g, " blvd "],
  [/\b(road|rd)\b/g, " rd "],
  [/\b(extension|ext)\b/g, " ext "],
  [/\b(barangay|brgy|bgy)\b/g, " brgy "],
  [/\b(general|gen)\b/g, " gen "],
];

/**
 * Normalized key for matching the same monitored location across reports:
 * case/accents/punctuation-insensitive, common abbreviations unified, and the
 * two sides of an intersection sorted ("A cor. B" = "B corner A").
 */
export function locationKey(text: string | null | undefined): string | null {
  if (!text) return null;
  let t = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  t = t.replace(/^\s*\d{1,3}\s*[.)\-:]\s*/, ""); // list numbering "2."
  t = t.split(/\s[-–—:]\s|\n/)[0] ?? t; // drop trailing " - No flooding"
  t = t.replace(/\([^)]*\)/g, " ");
  t = t.replace(/[&/]/g, " cor ");
  t = t.replace(/[^a-z0-9\s]/g, " ");
  for (const [re, rep] of WORD_ABBREVIATIONS) t = t.replace(re, rep);
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const parts = t
    .split(/\s+cor\s+|^cor\s+|\s+cor$/)
    .map((p) => p.trim())
    .filter(Boolean)
    .sort();
  return parts.length ? parts.join(" cor ") : null;
}

export function locationLabel(loc: ExtractedLocation): string {
  return (
    providedText(loc.rawLocationText) ??
    providedText(loc.roadName) ??
    providedText(loc.landmark) ??
    sourceText(loc.rawLocationText) ??
    `Location ${loc.index + 1}`
  );
}

// ---------------------------------------------------------------------------
// Flood condition
// ---------------------------------------------------------------------------

const NO_FLOOD =
  /\b(no\s+flood(?:ing|ed|water)?|not\s+flooded|flood[-\s]?free|no\s+water\s+(?:accumulation|on\s+(?:the\s+)?road)|no\s+standing\s+water)\b/i;
const SUBSIDED = /\b(subsided|receded|flood(?:ing|water)?\s+(?:has\s+)?cleared)\b/i;
const PARTIAL = /\b(partial(?:ly)?|subsiding|receding|slowly|still)\b/i;
/** Program/team names that mention floods without reporting one. */
const FLOOD_PROGRAM = /\bflood[-\s]+(?:monitoring|control|prone|watch|mitigation)\b/gi;
const FLOOD_WORDS =
  /\b(flood(?:ed|ing|water|waters)?|knee|ankle|waist|gutter|tire|chest|inundat\w*|impassable|not\s+passable|water\s+accumulation)\b/i;

/** Source text that can describe a location's flood condition (not interventions). */
function conditionTexts(loc: ExtractedLocation): string[] {
  return [
    sourceText(loc.flood.currentFloodHeight),
    sourceText(loc.roadStatus),
    sourceText(loc.remarks),
    sourceText(loc.rawLocationText),
    sourceText(loc.flood.floodSubsidedAt),
  ].filter((t): t is string => Boolean(t));
}

function quote(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return `“${clean.length > 80 ? `${clean.slice(0, 79)}…` : clean}”`;
}

export function observeLocation(loc: ExtractedLocation): LocationObservation {
  const label = locationLabel(loc);
  const height = loc.flood.currentFloodHeight;
  const measured = height.status === "provided" && typeof height.value === "number" ? height.value : null;
  const texts = conditionTexts(loc);
  const joined = texts.join(" \n ");
  const withoutProgramNames = joined.replace(FLOOD_PROGRAM, " ");

  const subsidedAt = provided(loc.flood.floodSubsidedAt);
  const subsidedRaw = sourceText(loc.flood.floodSubsidedAt);
  const subsidedStated =
    (Boolean(subsidedAt) && !(subsidedRaw && PARTIAL.test(subsidedRaw))) ||
    (SUBSIDED.test(joined) && !PARTIAL.test(joined));
  const noFloodPhrase = joined.match(NO_FLOOD)?.[0] ?? null;

  let condition: FloodCondition = "unknown";
  let basis: string | null = null;

  if (measured !== null && measured > 0) {
    condition = "flooded";
    basis = `Measured water level stated in report: ${quote(height.raw ?? formatMeters(measured) ?? "")}`;
  } else if (measured === 0) {
    // The source itself stated a zero measurement ("0.00 m"); keep its wording.
    condition = subsidedStated ? "subsided" : "no_flooding";
    basis = `Report states ${quote(height.raw ?? "0")}`;
  } else if (subsidedStated) {
    condition = "subsided";
    const phrase = joined.match(SUBSIDED)?.[0];
    basis = phrase ? `Source wording: ${quote(phrase)}` : "Flood subsided time stated in report";
  } else if (noFloodPhrase) {
    condition = "no_flooding";
    basis = `Source wording: ${quote(noFloodPhrase)}`;
  } else if (height.status === "ambiguous" && height.raw) {
    condition = "flooding_reported_unmeasured";
    basis = `Water level stated but not a clear measurement: ${quote(height.raw)}`;
  } else if (FLOOD_WORDS.test(withoutProgramNames)) {
    condition = "flooding_reported_unmeasured";
    basis = `Source wording: ${quote(withoutProgramNames.match(FLOOD_WORDS)?.[0] ?? "")}`;
  }

  const rainfall =
    loc.rainfall.rainfallIntensity.status === "provided" ? sourceText(loc.rainfall.rainfallIntensity) : null;

  return {
    index: loc.index,
    key: locationKey(label),
    label,
    condition,
    conditionBasis: basis,
    heightM: measured !== null && measured > 0 ? measured : null,
    heightRaw: sourceText(height),
    heightApproximate: Boolean(height.approximate),
    subsidedAt: subsidedAt ?? null,
    roadStatus: providedText(loc.roadStatus),
    intervention: providedText(loc.intervention.interventionText),
    rainfall,
    remarks: providedText(loc.remarks),
  };
}

export function observeReport(record: BridgeReportRecord): LocationObservation[] {
  return (record.extraction?.locations ?? []).map(observeLocation);
}

export function isFlooded(c: FloodCondition): boolean {
  return c === "flooded" || c === "flooding_reported_unmeasured";
}

export function isClear(c: FloodCondition): boolean {
  return c === "no_flooding" || c === "subsided";
}

export function floodMetrics(observations: LocationObservation[]): FloodMetrics {
  const m: FloodMetrics = { monitored: observations.length, flooded: 0, noFlooding: 0, subsided: 0, unknown: 0 };
  for (const o of observations) {
    if (isFlooded(o.condition)) m.flooded++;
    else if (isClear(o.condition)) m.noFlooding++;
    else m.unknown++;
    if (o.condition === "subsided") m.subsided++;
  }
  return m;
}

/** One-line human description of a location's state. Never prints 0.00 m for "no flooding". */
export function describeObservation(o: LocationObservation): string {
  switch (o.condition) {
    case "flooded": {
      const h = formatMeters(o.heightM);
      return `${o.heightApproximate ? "approx. " : ""}${h ?? "Flooded"}`;
    }
    case "flooding_reported_unmeasured":
      return o.heightRaw ? `Flooding reported (${o.heightRaw})` : "Flooding reported; water level not stated";
    case "subsided": {
      const t = formatClock(o.subsidedAt);
      return t ? `No flooding — subsided as of ${t}` : "No flooding — subsided";
    }
    case "no_flooding":
      return "No flooding reported";
    default:
      return "Flood status not reported";
  }
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

const WEATHER_LINE = /weather(?:\s+condition)?\s*[:\-–]\s*([^\n]*)(?:\n\s*([^\n]+))?/i;

/**
 * Weather as written in the report: the "Weather condition:" line of the
 * original message (verbatim), else the rainfall intensities the extraction
 * found on locations. Null when the report states neither.
 */
export function observeWeather(record: BridgeReportRecord): WeatherObservation | null {
  const text = record.source.messageText ?? "";
  const m = WEATHER_LINE.exec(text);
  if (m) {
    const value = (m[1]?.trim() || m[2]?.trim() || "").replace(/\s+/g, " ");
    if (value && !/^\d+[.)]/.test(value)) {
      return { text: value.length > 80 ? `${value.slice(0, 79)}…` : value, origin: "source_text" };
    }
  }
  const intensities = new Set<string>();
  for (const loc of record.extraction?.locations ?? []) {
    const raw = sourceText(loc.rainfall.rainfallIntensity);
    if (raw && loc.rainfall.rainfallIntensity.status === "provided") intensities.add(raw);
  }
  if (intensities.size) return { text: [...intensities].join(" / "), origin: "extracted_rainfall" };
  return null;
}

export function sameText(a: string | null, b: string | null): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return a !== null && b !== null && n(a) === n(b);
}
