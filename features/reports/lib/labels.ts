import type { BadgeVariant } from "@/components/ui/badge";
import type {
  BridgeReportStatus,
  BridgeReportType,
  FloodCondition,
  IncidentSeverity,
  IncidentStatus,
  LocationChangeKind,
} from "@/features/reports/types";

/** Known platforms. Unknown ids still render (title-cased) so new sources need no UI change. */
const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  viber: "Viber",
};

export function platformLabel(platform: string | null | undefined): string {
  if (!platform) return "Unknown source";
  return PLATFORM_LABELS[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** Dot + text classes per platform (WhatsApp green, Viber violet-blue, others cyan). */
export function platformTone(platform: string | null | undefined): { dot: string; text: string; ring: string } {
  switch (platform) {
    case "whatsapp":
      return { dot: "bg-[#25d366]", text: "text-[#16a34a] dark:text-[#4ade80]", ring: "border-[#25d366]/40" };
    case "viber":
      return { dot: "bg-[#7360f2]", text: "text-[#6d5ae6] dark:text-[#a99cff]", ring: "border-[#7360f2]/40" };
    default:
      return { dot: "bg-info", text: "text-info", ring: "border-info/40" };
  }
}

export const STATUS_META: Record<BridgeReportStatus, { label: string; variant: BadgeVariant; hint: string }> = {
  received: { label: "New", variant: "info", hint: "Stored by the OKB Bridge; waiting for AI processing." },
  processing: { label: "AI Processing", variant: "info", hint: "AI analysis is in progress." },
  extracted: { label: "AI Processed", variant: "primary", hint: "AI extraction complete; awaiting operator review." },
  needs_review: {
    label: "Needs Review",
    variant: "warning",
    hint: "AI extraction complete, but some values are missing, ambiguous or flagged.",
  },
  approved: { label: "Reviewed", variant: "success", hint: "An operator reviewed and approved this report." },
  rejected: { label: "Rejected", variant: "default", hint: "An operator rejected this report." },
  ignored: { label: "Not a Flood Report", variant: "default", hint: "Classified as not a flood report (chat, notices, etc.)." },
  failed: { label: "AI Failed", variant: "danger", hint: "AI processing failed; the original message is preserved." },
};

export function statusMeta(status: string) {
  return (
    STATUS_META[status as BridgeReportStatus] ?? {
      label: status.replaceAll("_", " ").toUpperCase(),
      variant: "default" as const,
      hint: "",
    }
  );
}

export const REPORT_TYPE_LABELS: Record<BridgeReportType, string> = {
  flood_monitoring: "Flood Monitoring Report",
  flood_prone_area_assessment: "Flood-Prone Area Assessment",
  non_flood_prone_area_assessment: "Non-Flood-Prone Area Assessment",
  other_flood_report: "Other Flood Report",
  not_flood_report: "Not a Flood Report",
};

export function reportTypeLabel(type: string | null | undefined): string {
  if (!type) return "Not yet classified";
  return REPORT_TYPE_LABELS[type as BridgeReportType] ?? type.replaceAll("_", " ");
}

export const FLOOD_REPORT_TYPES: readonly BridgeReportType[] = [
  "flood_monitoring",
  "flood_prone_area_assessment",
  "non_flood_prone_area_assessment",
  "other_flood_report",
];

export const CONDITION_META: Record<FloodCondition, { label: string; variant: BadgeVariant; tone: string }> = {
  flooded: { label: "Flooded", variant: "warning", tone: "text-warning" },
  flooding_reported_unmeasured: { label: "Flooding reported", variant: "warning", tone: "text-warning" },
  no_flooding: { label: "No flooding reported", variant: "success", tone: "text-success" },
  subsided: { label: "Flooding subsided", variant: "success", tone: "text-success" },
  unknown: { label: "Not reported", variant: "default", tone: "text-muted-foreground" },
};

export const CHANGE_META: Record<LocationChangeKind, { label: string; variant: BadgeVariant; arrow: string }> = {
  newly_flooded: { label: "Newly flooded", variant: "danger", arrow: "↑" },
  subsided: { label: "Flooding subsided", variant: "success", arrow: "↓" },
  level_increased: { label: "Water level increased", variant: "danger", arrow: "↑" },
  level_decreased: { label: "Water level decreased", variant: "success", arrow: "↓" },
  still_flooded: { label: "Still flooded", variant: "warning", arrow: "→" },
  unchanged_flooded: { label: "Unchanged (flooded)", variant: "warning", arrow: "→" },
  unchanged_clear: { label: "Unchanged (no flooding)", variant: "default", arrow: "→" },
  new_location: { label: "Newly listed", variant: "info", arrow: "+" },
  no_longer_listed: { label: "No longer listed", variant: "default", arrow: "−" },
  not_comparable: { label: "Not comparable", variant: "default", arrow: "?" },
};

export const INCIDENT_TYPES = [
  { value: "flooding", label: "Flooding" },
  { value: "road_obstruction", label: "Road Obstruction / Impassable Road" },
  { value: "high_water_level", label: "High Water Level" },
  { value: "infrastructure_damage", label: "Infrastructure Damage" },
  { value: "drainage_clogging", label: "Drainage Clogging" },
  { value: "other", label: "Other" },
] as const;

export function incidentTypeLabel(value: string): string {
  return INCIDENT_TYPES.find((t) => t.value === value)?.label ?? value.replaceAll("_", " ");
}

export const SEVERITY_META: Record<IncidentSeverity, { label: string; variant: BadgeVariant }> = {
  low: { label: "Low", variant: "info" },
  moderate: { label: "Moderate", variant: "warning" },
  high: { label: "High", variant: "danger" },
  critical: { label: "Critical", variant: "danger" },
};

export const INCIDENT_STATUS_META: Record<IncidentStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: "Open", variant: "danger" },
  monitoring: { label: "Monitoring", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "default" },
};

/** Status filter options (UI). "Confirmed" = an incident was created from the report. */
export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "received", label: "New" },
  { value: "processing", label: "AI Processing" },
  { value: "extracted", label: "AI Processed" },
  { value: "needs_review", label: "Needs Review" },
  { value: "approved", label: "Reviewed" },
  { value: "confirmed", label: "Confirmed (incident created)" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "AI Failed" },
  { value: "ignored", label: "Not a Flood Report" },
];

export const REPORT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All report types" },
  ...Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export const DATE_PRESET_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];
