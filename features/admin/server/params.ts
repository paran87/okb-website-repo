import type { StatsRange, VisitArea } from "@/features/admin/types";

const RANGES: readonly StatsRange[] = ["today", "7d", "30d", "90d"];

export function parseRange(value: string | null): StatsRange {
  return RANGES.includes(value as StatsRange) ? (value as StatsRange) : "7d";
}

export function parseArea(value: string | null): VisitArea | null {
  return value === "website" || value === "command" ? value : null;
}
