import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { listMyReports } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** The reports sent from this phone ({ items: [{ id, token }] }, the edit keys the phone kept). */
export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-report-mine", 120, 10 * 60_000);
  return ok(await listMyReports(await request.json().catch(() => null)));
});
