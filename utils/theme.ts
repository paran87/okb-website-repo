/**
 * Theme helpers — Tailwind class mappings and CSS variable resolvers for the
 * design system signal palettes.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "critical";

export const STATUS_TEXT_CLASS: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  critical: "text-critical",
};

export const STATUS_BG_CLASS: Record<StatusTone, string> = {
  success: "bg-success/15",
  warning: "bg-warning/15",
  danger: "bg-danger/15",
  info: "bg-info/15",
  critical: "bg-critical/15",
};

export type FloodLevel = "minor" | "moderate" | "major" | "severe" | "receding";
export type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rain"
  | "storm"
  | "typhoon";
export type EquipmentState =
  | "operational"
  | "deployed"
  | "maintenance"
  | "offline";
export type RiskLevel = "low" | "moderate" | "high" | "severe";
export type RoadState = "open" | "partial" | "closed";

export const FLOOD_TEXT_CLASS: Record<FloodLevel, string> = {
  minor: "text-flood-minor",
  moderate: "text-flood-moderate",
  major: "text-flood-major",
  severe: "text-flood-severe",
  receding: "text-flood-receding",
};

export const FLOOD_BG_CLASS: Record<FloodLevel, string> = {
  minor: "bg-flood-minor/15",
  moderate: "bg-flood-moderate/15",
  major: "bg-flood-major/15",
  severe: "bg-flood-severe/15",
  receding: "bg-flood-receding/15",
};

export const WEATHER_TEXT_CLASS: Record<WeatherCondition, string> = {
  sunny: "text-weather-sunny",
  cloudy: "text-weather-cloudy",
  rain: "text-weather-rain",
  storm: "text-weather-storm",
  typhoon: "text-weather-typhoon",
};

export const EQUIPMENT_TEXT_CLASS: Record<EquipmentState, string> = {
  operational: "text-equipment-operational",
  deployed: "text-equipment-deployed",
  maintenance: "text-equipment-maintenance",
  offline: "text-equipment-offline",
};

export const RISK_TEXT_CLASS: Record<RiskLevel, string> = {
  low: "text-risk-low",
  moderate: "text-risk-moderate",
  high: "text-risk-high",
  severe: "text-risk-severe",
};

export const ROAD_TEXT_CLASS: Record<RoadState, string> = {
  open: "text-road-open",
  partial: "text-road-partial",
  closed: "text-road-closed",
};

/** Resolve a status tone to its live CSS variable (for canvas/map rendering). */
export function statusColorVar(tone: StatusTone): string {
  return `var(--${tone})`;
}

export function floodColorVar(level: FloodLevel): string {
  return `var(--flood-${level})`;
}

export function riskColorVar(level: RiskLevel): string {
  return `var(--risk-${level})`;
}

export const THEMES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEMES)[number];
