import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { clientIp } from "@/features/flood-report/server/rate-limit";
import { whoAmI } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/**
 * This phone's internet address as the site sees it, and whether reports sent from it go into the automated
 * WhatsApp report (for setting OKB_MOBILE_REPORT_TEST_IPS while that is tested). Only the caller's own address.
 */
export const GET = withApiHandler(async (request: NextRequest) => ok(whoAmI(clientIp(request))));
