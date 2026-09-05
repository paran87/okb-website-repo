/**
 * Application-wide constants. Centralized so magic values live in one place.
 */

export const APP = {
  name: "OKB Command Center",
  shortName: "OKB",
  organization: "Department of Public Works and Highways",
  organizationShort: "DPWH",
  program: "Oplan Kontra Baha",
} as const;

/** Public Oplan Kontra Baha website routes. */
export const PUBLIC_ROUTES = {
  home: "/",
  about: "/about",
  initiatives: "/initiatives",
  framework: "/framework",
  activity: "/activity",
  accomplishment: "/accomplishment",
  advisories: "/advisories",
  profile: "/profile",
  contact: "/contact",
  commandCenter: "/command",
} as const;

/** Official memorandum PDF presented on the OKB Framework page. */
export const FRAMEWORK_DOCUMENT_HREF =
  "/framework/operational-framework.pdf" as const;

/** Live Oplan Kontra Baha accomplishments dashboard (Google Apps Script). */
export const ACCOMPLISHMENT_DASHBOARD_URL =
  "https://script.google.com/macros/s/AKfycbzX6AKleN8DhDTU5Re8kOwQk4lF71YRUgl9ZjgUJv4marmOFWbTw-uweiSK5tr1kl3A/exec";

/** Command Center route paths (single source of truth for navigation + links). */
export const ROUTES = {
  dashboard: "/command",
  dashboardAlt: "/command/dashboard",
  floodMonitoring: "/command/flood-monitoring",
  incidents: "/command/incidents",
  criticalAreas: "/command/critical-areas",
  floodProne: "/command/flood-prone",
  drainages: "/command/drainages",
  roads: "/command/roads",
  waterways: "/command/waterways",
  projects: "/command/projects",
  equipment: "/command/equipment",
  weather: "/command/weather",
  reports: "/command/reports",
  analytics: "/command/analytics",
  users: "/command/users",
  settings: "/command/settings",
} as const;

/** Default operational region shown in the status bar until auth/region context lands. */
export const DEFAULT_REGION = "National Capital Region (NCR)" as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 50,
  maxPageSize: 200,
} as const;

/** Default map viewport (Philippines / Metro Manila). */
export const MAP_DEFAULTS = {
  longitude: 121.774,
  latitude: 12.8797,
  zoom: 5.2,
} as const;

export const QUERY_STALE_TIME = 30_000;
