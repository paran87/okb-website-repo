import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { testSend } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Test Send: the backend builds a TEST REPORT from recent reports (it does not consume them or move the
 * reporting period). The bridge phone sends its TEXT automatically to the destination group at its next check;
 * the PDF waits on the phone for the operator ("Send as PDF").
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { operatorName } = await requireReportsAccess(request, { mutating: true });
  return created(await testSend(operatorName));
});
