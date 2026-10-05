/**
 * Reads the structured AI summary written by the OKB Bridge
 * (OVERALL SITUATION / LOCATIONS / WEATHER). Older summaries are plain
 * sentences; they are shown as they are.
 */
export interface ParsedAiSummary {
  /** The OVERALL SITUATION text, or the whole summary when it is unstructured. */
  overall: string;
  /** Numbered entries under LOCATIONS, or null for an unstructured summary. */
  locationCount: number | null;
  structured: boolean;
}

export function parseAiSummary(text: string): ParsedAiSummary {
  const overall = /OVERALL SITUATION:\s*\n?([\s\S]*?)(?=\n\s*(?:LOCATIONS|WEATHER):|$)/i.exec(text);
  const locations = /(?:^|\n)\s*LOCATIONS:\s*\n([\s\S]*?)(?=\n\s*(?:WEATHER|OVERALL SITUATION):|$)/i.exec(text);
  if (!overall && !locations) return { overall: text.trim(), locationCount: null, structured: false };
  return {
    overall: (overall?.[1] ?? "").trim() || text.trim(),
    locationCount: locations?.[1] ? (locations[1].match(/^[ \t]*\d{1,3}[.)][ \t]+\S/gm) ?? []).length : null,
    structured: true,
  };
}
