import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { directUploadStatus, ensureDirectUploads } from "@/features/admin/server/media";
import { requireAdmin, siteOrigin } from "@/features/admin/server/session";

export const dynamic = "force-dynamic";

/** Whether browsers on this site may upload straight to the R2 bucket (set up on the spot when it is not). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const origin = siteOrigin(request);
  const setup = await ensureDirectUploads(origin);
  return ok({ origin, status: await directUploadStatus(origin), setup });
});
