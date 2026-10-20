import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { listReportsForAdmin } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** Admin → Reports: OKB Mobile reports and WhatsApp / Viber messages of the last ?days= (1, 7 or 30; "all"; default 7). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const raw = request.nextUrl.searchParams.get("days");
  const asked = Number(raw);
  const days = raw === "all" ? null : [1, 7, 30].includes(asked) ? asked : 7;
  const response = ok(await listReportsForAdmin(days));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
