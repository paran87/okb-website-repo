import type { NextRequest } from "next/server";
import { ValidationError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { reverseGeocode } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** Street, barangay and city for the camera's GPS position (?lat=&lng=), from OpenStreetMap. */
export const GET = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-geocode", 200, 10 * 60_000);
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new ValidationError("lat and lng are required");
  }
  return ok(await reverseGeocode(lat, lng, request.nextUrl.origin));
});
