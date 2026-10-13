import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { runStorageCheck } from "@/features/admin/server/storage-check";

export const dynamic = "force-dynamic";

/** Tests the R2 key against the configured bucket (list, upload, delete a test file). */
export const POST = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const result = await runStorageCheck();
  const response = ok(result);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
