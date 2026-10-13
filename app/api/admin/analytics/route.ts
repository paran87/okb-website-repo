import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { getVisitStats } from "@/features/admin/server/visits";
import { parseArea, parseRange } from "@/features/admin/server/params";

export const dynamic = "force-dynamic";

/** Visitor statistics (?range=today|7d|30d|90d&area=website|command). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const params = request.nextUrl.searchParams;
  const stats = await getVisitStats(parseRange(params.get("range")), parseArea(params.get("area")));
  const response = ok(stats);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
