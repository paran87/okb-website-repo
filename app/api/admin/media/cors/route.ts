import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { directUploadStatus, enableDirectUploads } from "@/features/admin/server/media";
import { requireAdmin } from "@/features/admin/server/session";

export const dynamic = "force-dynamic";

function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Whether browsers on this site may upload straight to the R2 bucket. */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const origin = siteOrigin(request);
  return ok({ origin, status: await directUploadStatus(origin) });
});

/** Adds this site's origin to the bucket's CORS rules. */
export const POST = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const origin = siteOrigin(request);
  await enableDirectUploads(origin);
  return ok({ origin, status: "enabled" as const });
});
