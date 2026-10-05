import type { NextRequest } from "next/server";
import { BadRequestError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getLocationHistory } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

/** Chronological observations of one monitored location across its series. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  const reportId = request.nextUrl.searchParams.get("reportId") ?? "";
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!reportId || !key || key.length > 300) throw new BadRequestError("reportId and key are required");
  return ok(await getLocationHistory(store, reportId, key));
});
