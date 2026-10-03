import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { fetchRiver } from "@/features/waterways/services/arcgis";

export const maxDuration = 60;

const SAFE_NAME = /^[\p{L}\p{N} .,'()&/-]{1,80}$/u;

/** A named river with all of its segments, for highlighting and zooming. */
export const GET = withApiHandler(async (request) => {
  const name = (request.nextUrl.searchParams.get("name") ?? "").trim();
  if (!SAFE_NAME.test(name))
    throw new BadRequestError("A valid river name is required");
  const river = await fetchRiver(name);
  if (!river) throw new NotFoundError("River not found");
  return ok(river);
});
