import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { listReportsForAdmin } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** Admin → Reports: reports sent from the OKB mobile page in the last ?days= (1, 7 or 30; default 7). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const asked = Number(request.nextUrl.searchParams.get("days"));
  const days = [1, 7, 30].includes(asked) ? asked : 7;
  const response = ok(await listReportsForAdmin(days));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
