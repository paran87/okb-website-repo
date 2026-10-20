import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { deleteFeedback, updateFeedback } from "@/features/feedback/server/service";

export const dynamic = "force-dynamic";

/** An admin changes a report's status or note. */
export const PATCH = withApiHandler(async (request: NextRequest, { params }) => {
  const admin = requireAdmin(request, { mutating: true });
  return ok(await updateFeedback((await params).id ?? "", admin, await request.json()));
});

/** An admin deletes a report (spam, a test) and its screenshot. */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  requireAdmin(request, { mutating: true });
  await deleteFeedback((await params).id ?? "");
  return ok({ deleted: true });
});
