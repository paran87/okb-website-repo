import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { listHistory } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** Consolidated report history (newest first), read from the OKB Bridge backend. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await requireReportsAccess(request);
  return ok(await listHistory(50));
});
