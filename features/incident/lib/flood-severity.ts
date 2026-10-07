/**
 * Flood depth severity used on the Incidents flood map (OKB categories):
 *
 *   0–0.5 m      Low     ankle to knee level
 *   >0.5–1.5 m   Medium  knee to neck level
 *   >1.5 m       High    above neck level
 *
 * A location reported as flooded without a stated depth is "unmeasured": it is shown, but never
 * given a depth it did not report.
 */
export type FloodSeverity = "low" | "medium" | "high" | "unmeasured";

export interface FloodSeverityMeta {
  label: string;
  /** Depth range as shown in the legend. */
  range: string;
  emoji: string;
  color: string;
  meaning: string;
}

export const FLOOD_SEVERITY: Record<FloodSeverity, FloodSeverityMeta> = {
  low: {
    label: "Low",
    range: "0–0.5 m (0–50 cm)",
    emoji: "🟢",
    color: "#16a34a",
    meaning: "Around ankle-to-knee level. Usually passable with caution, but fast-moving water can still be dangerous.",
  },
  medium: {
    label: "Medium",
    range: ">0.5–1.5 m (50–150 cm)",
    emoji: "🟠",
    color: "#f97316",
    meaning: "Around knee-to-neck level. Dangerous for walking, especially with currents; vehicles can become stranded.",
  },
  high: {
    label: "High",
    range: ">1.5 m (150+ cm)",
    emoji: "🔴",
    color: "#dc2626",
    meaning: "Above neck level for an average person. Potentially life-threatening and can inundate homes and buildings.",
  },
  unmeasured: {
    label: "Depth not reported",
    range: "Flooding reported, no depth given",
    emoji: "⚪",
    color: "#64748b",
    meaning: "The report says the place is flooded but gives no depth.",
  },
};

/** Severity order, most severe first (legend and list order). */
export const SEVERITY_ORDER: FloodSeverity[] = ["high", "medium", "low", "unmeasured"];

/** Severity of a reported depth in meters (null = flooded, depth not reported). */
export function floodSeverity(heightM: number | null): FloodSeverity {
  if (heightM === null || !Number.isFinite(heightM) || heightM <= 0) return "unmeasured";
  if (heightM <= 0.5) return "low";
  if (heightM <= 1.5) return "medium";
  return "high";
}
