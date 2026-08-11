import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

/**
 * Middleware foundation (Next.js 16 `proxy` convention, Edge runtime).
 *
 * FOUNDATION PHASE: this is a pass-through. The auth wrapper makes `req.auth`
 * available so route protection can be switched on in a single place once the
 * login flow exists — e.g.:
 *
 *   if (!req.auth?.user && isProtected(req.nextUrl.pathname)) {
 *     return NextResponse.redirect(new URL("/login", req.nextUrl));
 *   }
 */
export default auth(() => {
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on pages only; skip API routes, Next internals, and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
