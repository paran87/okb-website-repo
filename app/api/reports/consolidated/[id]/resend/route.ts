import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { resend } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** Queues the same PDF for the bridge phone again (it sends it automatically, else shows "PDF Ready"). */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true, area: "settings" });
  return ok(await resend((await params).id ?? ""));
});
