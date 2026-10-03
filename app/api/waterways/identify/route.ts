import { BadRequestError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { identifyRiver } from "@/features/waterways/services/arcgis";

export const maxDuration = 60;

/** River segment under a map click. */
export const GET = withApiHandler(async (request) => {
  const params = request.nextUrl.searchParams;
  const lng = Number(params.get("lng"));
  const lat = Number(params.get("lat"));
  const zoom = Math.min(Math.max(Number(params.get("z")) || 10, 4), 20);
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    Math.abs(lng) > 180 ||
    Math.abs(lat) > 85
  ) {
    throw new BadRequestError("lng and lat are required");
  }
  return ok(await identifyRiver(lng, lat, zoom));
});
