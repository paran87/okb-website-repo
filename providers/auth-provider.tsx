"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { ROLE_LABELS, UserRole } from "@/lib/rbac/roles";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Placeholder authentication provider. Returns a static operator identity until
 * NextAuth login is wired in a later phase.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: {
        id: "placeholder",
        name: "Operator",
        email: "operator@dpwh.gov.ph",
        role: UserRole.ADMINISTRATOR,
      },
      isAuthenticated: false,
      isLoading: false,
    }),
    [],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** Human-readable role label for the current auth user. */
export function useAuthRoleLabel(): string {
  const { user } = useAuth();
  return user ? ROLE_LABELS[user.role] : "Guest";
}
