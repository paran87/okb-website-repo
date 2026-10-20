import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { listPublicReports, MAP_HOURS, submitReport } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** Public map: mobile flood reports of the last ?hours= (6, 24, 72 or 168; default 24). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const asked = Number(request.nextUrl.searchParams.get("hours"));
  const hours = (MAP_HOURS as readonly number[]).includes(asked) ? asked : 24;
  return ok(await listPublicReports(hours));
});

/** A flood report from the mobile page (its photos are uploaded first through /api/flood-reports/photos). */
export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-report", 30, 10 * 60_000);
  return created(await submitReport(await request.json()));
});
