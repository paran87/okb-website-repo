import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { submitFeedback } from "@/features/feedback/server/service";

export const dynamic = "force-dynamic";

/** "Report a problem" from any page (multipart form; the screenshot is optional). */
export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "feedback", 8, 10 * 60_000);
  return created(await submitFeedback(await request.formData(), request.headers.get("user-agent") ?? ""));
});
