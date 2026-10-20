import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { listFeedback } from "@/features/feedback/server/service";

export const dynamic = "force-dynamic";

/** Admin → Feedback: reports, newest first (?status=open|new|in_progress|fixed|wont_fix|all). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  return ok(await listFeedback(request.nextUrl.searchParams.get("status") ?? "open"));
});
