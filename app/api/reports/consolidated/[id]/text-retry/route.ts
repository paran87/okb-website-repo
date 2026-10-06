import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { retryText } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** Retries a failed automatic TEXT delivery; the bridge phone sends it at its next check. Never re-sends a sent one. */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true });
  return ok(await retryText((await params).id ?? ""));
});
