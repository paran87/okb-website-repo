/**
 * OKB Command Center — Design System token registry.
 *
 * Runtime styling uses CSS custom properties (see styles/globals.css).
 * This module provides typed constants for programmatic access (charts, canvas,
 * map layers) and documents the token vocabulary in one place.
 */

/** Core semantic colors (adapt to light/dark via CSS variables). */
export const colors = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  critical: "var(--critical)",
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  sidebar: "var(--sidebar)",
  header: "var(--header)",
} as const;

/** Operational signal palettes (theme-independent). */
export const floodColors = {
  minor: "var(--flood-minor)",
  moderate: "var(--flood-moderate)",
  major: "var(--flood-major)",
  severe: "var(--flood-severe)",
  receding: "var(--flood-receding)",
} as const;

export const weatherColors = {
  sunny: "var(--weather-sunny)",
  cloudy: "var(--weather-cloudy)",
  rain: "var(--weather-rain)",
  storm: "var(--weather-storm)",
  typhoon: "var(--weather-typhoon)",
} as const;

export const equipmentColors = {
  operational: "var(--equipment-operational)",
  deployed: "var(--equipment-deployed)",
  maintenance: "var(--equipment-maintenance)",
  offline: "var(--equipment-offline)",
} as const;

export const riskColors = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  severe: "var(--risk-severe)",
} as const;

export const roadColors = {
  open: "var(--road-open)",
  partial: "var(--road-partial)",
  closed: "var(--road-closed)",
} as const;

export const mapColors = {
  overlay: "var(--map-overlay)",
  marker: "var(--map-marker)",
  selection: "var(--map-selection)",
  route: "var(--map-route)",
  zoneFill: "var(--map-zone-fill)",
  zoneStroke: "var(--map-zone-stroke)",
} as const;

export const notificationColors = {
  default: "var(--notification-default)",
} as const;

/** Spacing scale (matches --space-* in globals.css). */
export const spacing = {
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
  "3xl": "var(--space-3xl)",
} as const;

/** Border radius scale. */
export const radius = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  card: "var(--radius)",
} as const;

/** Elevation shadows. */
export const shadows = {
  card: "var(--shadow-card)",
  panel: "var(--shadow-panel)",
  dialog: "var(--shadow-dialog)",
  dropdown: "var(--shadow-dropdown)",
  sidebar: "var(--shadow-sidebar)",
} as const;

/** Typography utility class names (Tailwind @utility tokens). */
export const typography = {
  display: "text-display",
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
  h4: "text-h4",
  bodyLg: "text-body-lg",
  body: "text-body",
  caption: "text-caption",
  label: "text-label",
  button: "text-button",
  table: "text-table",
  mapLabel: "text-map-label",
} as const;

/** Default chart series palette (Recharts / canvas). */
export const chartPalette = [
  colors.primary,
  colors.info,
  colors.success,
  colors.warning,
  colors.danger,
  colors.secondary,
  floodColors.moderate,
  weatherColors.rain,
] as const;
