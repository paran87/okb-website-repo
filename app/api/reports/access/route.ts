import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getReportsConfig } from "@/features/reports/server/config";
import {
  assertSameOrigin,
  clearAccessCookie,
  getAccessState,
  keyMatches,
  setAccessCookie,
} from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

/** Access state for the gate UI. Contains no report data. */
export const GET = withApiHandler(async (request: NextRequest) => ok(await getAccessState(request)));

const grantSchema = z.object({
  accessKey: z.string().min(1).max(500),
  operatorName: z.string().trim().min(2, "Enter your name").max(80),
});

/** Exchanges the shared operator access key for a signed, httpOnly session cookie. */
export const POST = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  const body = grantSchema.parse(await request.json());
  const cfg = getReportsConfig();
  if (!cfg.accessKey) {
    throw new ApiError(403, "FORBIDDEN", "Operator access is not configured on the server.", {
      reason: "access_not_configured",
    });
  }
  if (!keyMatches(cfg, body.accessKey)) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 800));
    throw new ApiError(401, "UNAUTHORIZED", "The access key is not valid.", { reason: "invalid_key" });
  }
  const response = ok({ granted: true, operatorName: body.operatorName });
  setAccessCookie(response, body.operatorName);
  return response;
});

export const DELETE = withApiHandler(async () => {
  const response = ok({ granted: false });
  clearAccessCookie(response);
  return response;
});
