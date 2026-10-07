import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { deleteReport } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** Removes a report from the history (with its PDF); a text not yet sent is dropped, so it is never sent. */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true });
  return ok(await deleteReport((await params).id ?? ""));
});
