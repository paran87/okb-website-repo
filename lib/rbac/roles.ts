/**
 * Canonical user roles for the OKB Command Center.
 *
 * These string values are the single source of truth and are mirrored by the
 * `UserRole` enum in `prisma/schema.prisma`. Keep both in sync.
 */
export const UserRole = {
  ADMINISTRATOR: "ADMINISTRATOR",
  NATIONAL_COMMAND: "NATIONAL_COMMAND",
  REGIONAL_DIRECTOR: "REGIONAL_DIRECTOR",
  DISTRICT_ENGINEER: "DISTRICT_ENGINEER",
  FIELD_ENGINEER: "FIELD_ENGINEER",
  VIEWER: "VIEWER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ALL_ROLES: readonly UserRole[] = Object.values(UserRole);

/**
 * Ordered from highest to lowest privilege. Used for hierarchy checks such as
 * "does this role rank at or above X".
 */
export const ROLE_HIERARCHY: readonly UserRole[] = [
  UserRole.ADMINISTRATOR,
  UserRole.NATIONAL_COMMAND,
  UserRole.REGIONAL_DIRECTOR,
  UserRole.DISTRICT_ENGINEER,
  UserRole.FIELD_ENGINEER,
  UserRole.VIEWER,
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: "Administrator",
  NATIONAL_COMMAND: "National Command",
  REGIONAL_DIRECTOR: "Regional Director",
  DISTRICT_ENGINEER: "District Engineer",
  FIELD_ENGINEER: "Field Engineer",
  VIEWER: "Viewer",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && value in UserRole;
}

/** Returns true if `role` ranks at or above `minimum` in the hierarchy. */
export function roleRankAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(role) <= ROLE_HIERARCHY.indexOf(minimum);
}
