import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { cancelText } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** Stops a scheduled or retrying automatic TEXT delivery; the bridge phone stops at its next check. */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true });
  return ok(await cancelText((await params).id ?? ""));
});
