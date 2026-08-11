import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/rbac/roles";

/**
 * Module augmentation so `session.user.id` / `session.user.role` are strongly
 * typed everywhere Auth.js is consumed.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
