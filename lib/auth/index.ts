import "server-only";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Auth.js instance (foundation phase).
 *
 * No providers are configured yet — login is intentionally not implemented in
 * this phase. Providers (e.g. Credentials backed by the User model, or an OAuth
 * provider) and a database adapter are added once the auth feature is built.
 * The exported `auth`, `signIn`, and `signOut` helpers are ready for use.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [],
});
