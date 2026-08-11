import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/api/errors";
import { hasPermission, type Permission } from "@/lib/rbac/permissions";
import type { UserRole } from "@/lib/rbac/roles";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
}

/**
 * Protected-route foundation.
 *
 * `requireUser` / `requirePermission` are the building blocks for guarding
 * server components and route handlers. They resolve the current session and
 * throw typed API errors when access is denied. Once the auth feature adds a
 * provider, these work end-to-end with no changes at call sites.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requirePermission(
  permission: Permission,
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError();
  }
  return user;
}
