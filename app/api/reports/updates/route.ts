import type { NextRequest } from "next/server";
import { BadRequestError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

/** Number of reports received after `since` (polled for the "new reports" notice). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  const since = new Date(request.nextUrl.searchParams.get("since") ?? "");
  if (Number.isNaN(since.getTime())) throw new BadRequestError("since must be an ISO timestamp");
  return ok({ count: await store.countSince(since), checkedAt: new Date().toISOString() });
});
