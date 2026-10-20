import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { confirmMedia } from "@/features/flood-report/server/media";

export const dynamic = "force-dynamic";

/** Called after a direct browser upload finishes: checks the file reached storage. */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  requireAdmin(request, { mutating: true });
  const { key } = z.object({ key: z.string().max(300) }).parse(await request.json());
  await confirmMedia(((await params).id ?? "").toLowerCase(), key);
  return ok({ key });
});
