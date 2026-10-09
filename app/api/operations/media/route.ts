import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { assertSameOrigin, getAccessState } from "@/features/reports/server/access";
import { isOperationsSection, OPERATIONS_SECTIONS } from "@/features/operations/config";
import { deleteOperationsMedia, listOperationsMedia } from "@/features/operations/server/media";
import { R2Error } from "@/features/operations/server/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sectionIds = OPERATIONS_SECTIONS.map((s) => s.id) as [string, ...string[]];

function storageError(err: unknown): never {
  if (err instanceof R2Error) {
    throw new ApiError(502, "INTERNAL_ERROR", "The media storage (Cloudflare R2) could not be reached.", {
      reason: "storage_error",
    });
  }
  throw err;
}

/** Operations media is only served to operators who entered the access key (same as Settings). */
async function requireOperationsAccess(request: NextRequest, action: string): Promise<void> {
  const state = await getAccessState(request, "operations");
  if (!state.granted) {
    throw new ApiError(401, "UNAUTHORIZED", `Enter the operator access key to ${action}.`, {
      reason: state.accessConfigured ? "access_required" : "access_not_configured",
    });
  }
}

/** Geotagged photos or operation videos of one section (?section=ncr-daily&kind=photos|videos). */
export const GET = withApiHandler(async (request: NextRequest) => {
  await requireOperationsAccess(request, "view operations media");
  const params = request.nextUrl.searchParams;
  const section = params.get("section");
  const kind = params.get("kind") === "videos" ? "videos" : "photos";
  if (!isOperationsSection(section)) throw new NotFoundError("Unknown operations section");
  const list = await listOperationsMedia(section, kind).catch(storageError);
  const response = ok(list);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});

const deleteSchema = z.object({
  section: z.enum(sectionIds),
  key: z.string().min(1).max(1024),
});

/** Removes a file from the gallery (moved to the bucket's trash folder). Operator access key required. */
export const DELETE = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  await requireOperationsAccess(request, "delete media");
  const body = deleteSchema.parse(await request.json());
  if (!isOperationsSection(body.section)) throw new NotFoundError("Unknown operations section");
  const removed = await deleteOperationsMedia(body.section, body.key).catch(storageError);
  if (!removed) throw new NotFoundError("File not found in this section");
  return ok({ deleted: body.key });
});
