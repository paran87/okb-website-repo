import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { retryPdf } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** Makes a failed PDF again and queues it for the bridge phone (its text report is not sent again). */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true, area: "settings" });
  return ok(await retryPdf((await params).id ?? ""));
});
