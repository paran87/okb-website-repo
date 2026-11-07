import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

/**
 * Site-wide sign-in (HTTP Basic Auth) while the website is not yet public: every page and API route asks the
 * browser for the user name and password in SITE_ACCESS_USER / SITE_ACCESS_PASSWORD (Vercel environment
 * variables, never in the code). The browser remembers them and sends them with the page's own requests.
 * With either variable unset the check is off (local development, or to open the site again).
 *
 * Not covered: the Vercel cron job (/api/cron/*, which checks CRON_SECRET itself and cannot send a password),
 * the health probe (/api/health), Next.js assets and the static files skipped by the matcher below.
 */
const REALM = "OKB website";

/** Compares in time that does not depend on where the strings differ. */
function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function signedIn(request: NextRequest, user: string, password: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return false;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  // Both compared, so a wrong user name takes as long as a wrong password.
  const userOk = sameText(decoded.slice(0, colon), user);
  const passwordOk = sameText(decoded.slice(colon + 1), password);
  return userOk && passwordOk;
}

export default auth((request) => {
  const user = process.env.SITE_ACCESS_USER?.trim();
  const password = process.env.SITE_ACCESS_PASSWORD;
  if (user && password && !signedIn(request, user, password)) {
    return new NextResponse("Sign in to view the OKB website.", {
      status: 401,
      headers: {
        "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Pages and API routes; skip the cron job and health probe, Next internals and static assets.
    "/((?!api/cron|api/health|studies|waterway-tiles|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
