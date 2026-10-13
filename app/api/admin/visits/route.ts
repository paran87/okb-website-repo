import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseArea, parseRange } from "@/features/admin/server/params";
import { requireAdmin } from "@/features/admin/server/session";
import { listVisits } from "@/features/admin/server/visits";

export const dynamic = "force-dynamic";

/** Visit log, newest first (?range&area&q&page). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Math.min(10_000, Number(params.get("page")) || 1));
  const result = await listVisits({
    range: parseRange(params.get("range")),
    area: parseArea(params.get("area")),
    search: params.get("q")?.slice(0, 80) ?? null,
    page,
    pageSize: 25,
  });
  const response = ok(result);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
