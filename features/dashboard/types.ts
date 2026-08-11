import type { LucideIcon } from "lucide-react";

/** KPI trend direction. */
export type TrendDirection = "up" | "down" | "flat";

/** Operational priority levels. */
export type Priority = "critical" | "high" | "medium" | "low";

/** Alert severity levels. */
export type AlertSeverity = "critical" | "warning" | "info" | "resolved";

/** Activity event categories. */
export type ActivityCategory =
  | "flood"
  | "equipment"
  | "weather"
  | "water"
  | "road"
  | "report"
  | "system";

/** KPI status tone for visual emphasis. */
export type KpiStatus = "normal" | "warning" | "critical" | "success";

export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  trend: TrendDirection;
  dailyChange: number;
  dailyChangeLabel: string;
  status: KpiStatus;
  sparkline: readonly number[];
}

export interface OperationalListItem {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  priority: Priority;
  status: string;
  statusTone: KpiStatus;
}

export interface WeatherSummary {
  region: string;
  temperature: number;
  temperatureUnit: string;
  rainfall: number;
  rainfallUnit: string;
  windSpeed: number;
  windUnit: string;
  humidity: number;
  stormStatus: string;
  stormTone: KpiStatus;
  updatedAt: string;
}

export interface EquipmentSummary {
  total: number;
  available: number;
  deployed: number;
  maintenance: number;
  utilizationPercent: number;
}

export interface SystemHealthItem {
  id: string;
  label: string;
  status: "online" | "degraded" | "offline";
  detail?: string;
}

export interface DashboardAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  location?: string;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  time: string;
  category: ActivityCategory;
  title: string;
  description: string;
  priority: Priority;
}

export interface DashboardMapState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  scaleLabel: string;
}

export interface DashboardData {
  kpis: readonly KpiMetric[];
  incidents: readonly OperationalListItem[];
  criticalAreas: readonly OperationalListItem[];
  fieldReports: readonly OperationalListItem[];
  roadClosures: readonly OperationalListItem[];
  weather: WeatherSummary;
  equipment: EquipmentSummary;
  systemHealth: readonly SystemHealthItem[];
  alerts: readonly DashboardAlert[];
  notifications: readonly DashboardAlert[];
  activity: readonly ActivityEvent[];
  map: DashboardMapState;
  lastUpdated: string;
}
