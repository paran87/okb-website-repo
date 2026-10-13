import type { StatsRange, VisitArea } from "@/features/admin/types";

/** Period and area filters shared by Overview and Visitors. */

export const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const satisfies readonly { value: StatsRange; label: string }[];

export const AREA_OPTIONS = [
  { value: "all", label: "All" },
  { value: "website", label: "Website" },
  { value: "command", label: "Command Center" },
] as const;

export type AreaFilter = (typeof AREA_OPTIONS)[number]["value"];

export function toArea(filter: AreaFilter): VisitArea | null {
  return filter === "all" ? null : filter;
}
