import type { NextAuthConfig } from "next-auth";
import { UserRole, isUserRole } from "@/lib/rbac/roles";

/**
 * Edge-safe Auth.js configuration.
 *
 * Contains NO Node-only imports (Prisma, bcrypt) so it can run inside the
 * middleware (Edge runtime). The Credentials provider with database access is
 * added in `lib/auth/index.ts`, which runs in the Node runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.role = isUserRole(user.role) ? user.role : UserRole.VIEWER;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    authorized({ auth }) {
      // Route protection is enforced in middleware; presence of a session is
      // the baseline check here.
      return Boolean(auth?.user);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
