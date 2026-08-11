import { UserRole } from "@/lib/rbac/roles";

/**
 * Fine-grained permissions expressed as `resource:action`.
 *
 * Feature code and API handlers should check permissions (not raw roles) so the
 * authorization matrix can evolve without touching call sites.
 */
export const Permission = {
  DASHBOARD_VIEW: "dashboard:view",

  MAP_VIEW: "map:view",

  INCIDENT_VIEW: "incident:view",
  INCIDENT_CREATE: "incident:create",
  INCIDENT_UPDATE: "incident:update",
  INCIDENT_DELETE: "incident:delete",

  CRITICAL_AREA_VIEW: "critical-area:view",
  CRITICAL_AREA_MANAGE: "critical-area:manage",

  FLOOD_PRONE_VIEW: "flood-prone:view",
  FLOOD_PRONE_MANAGE: "flood-prone:manage",

  EQUIPMENT_VIEW: "equipment:view",
  EQUIPMENT_MANAGE: "equipment:manage",

  PROJECT_VIEW: "project:view",
  PROJECT_MANAGE: "project:manage",

  WEATHER_VIEW: "weather:view",

  REPORT_VIEW: "report:view",
  REPORT_GENERATE: "report:generate",

  ROAD_VIEW: "road:view",
  ROAD_MANAGE: "road:manage",

  WATERWAY_VIEW: "waterway:view",
  WATERWAY_MANAGE: "waterway:manage",

  ANALYTICS_VIEW: "analytics:view",

  USER_VIEW: "user:view",
  USER_MANAGE: "user:manage",

  SETTINGS_MANAGE: "settings:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL_PERMISSIONS: readonly Permission[] = Object.values(Permission);

const VIEW_PERMISSIONS: readonly Permission[] = [
  Permission.DASHBOARD_VIEW,
  Permission.MAP_VIEW,
  Permission.INCIDENT_VIEW,
  Permission.CRITICAL_AREA_VIEW,
  Permission.FLOOD_PRONE_VIEW,
  Permission.EQUIPMENT_VIEW,
  Permission.PROJECT_VIEW,
  Permission.WEATHER_VIEW,
  Permission.REPORT_VIEW,
  Permission.ROAD_VIEW,
  Permission.WATERWAY_VIEW,
  Permission.ANALYTICS_VIEW,
];

const FIELD_ENGINEER_PERMISSIONS: readonly Permission[] = [
  ...VIEW_PERMISSIONS,
  Permission.INCIDENT_CREATE,
  Permission.INCIDENT_UPDATE,
];

const DISTRICT_ENGINEER_PERMISSIONS: readonly Permission[] = [
  ...FIELD_ENGINEER_PERMISSIONS,
  Permission.EQUIPMENT_MANAGE,
  Permission.PROJECT_MANAGE,
  Permission.CRITICAL_AREA_MANAGE,
  Permission.FLOOD_PRONE_MANAGE,
  Permission.REPORT_GENERATE,
];

const REGIONAL_DIRECTOR_PERMISSIONS: readonly Permission[] = [
  ...DISTRICT_ENGINEER_PERMISSIONS,
  Permission.INCIDENT_DELETE,
  Permission.USER_VIEW,
];

const NATIONAL_COMMAND_PERMISSIONS: readonly Permission[] = [
  ...REGIONAL_DIRECTOR_PERMISSIONS,
  Permission.USER_MANAGE,
];

/** Role -> granted permissions. Administrator implicitly holds everything. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.ADMINISTRATOR]: ALL_PERMISSIONS,
  [UserRole.NATIONAL_COMMAND]: NATIONAL_COMMAND_PERMISSIONS,
  [UserRole.REGIONAL_DIRECTOR]: REGIONAL_DIRECTOR_PERMISSIONS,
  [UserRole.DISTRICT_ENGINEER]: DISTRICT_ENGINEER_PERMISSIONS,
  [UserRole.FIELD_ENGINEER]: FIELD_ENGINEER_PERMISSIONS,
  [UserRole.VIEWER]: VIEW_PERMISSIONS,
};

export function hasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
