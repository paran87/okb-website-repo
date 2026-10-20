import type { NextRequest } from "next/server";
import { ValidationError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { reverseGeocode } from "@/features/flood-report/server/service";
import { nearestDeo } from "@/features/incident/server/roads";
import { shortDeo } from "@/features/flood-report/lib/options";

export const dynamic = "force-dynamic";

/**
 * Street, barangay and city for the camera's GPS position (?lat=&lng=), from OpenStreetMap, with the DEO of
 * the nearest national road as a suggestion for the form.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-geocode", 200, 10 * 60_000);
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new ValidationError("lat and lng are required");
  }
  const [place, deo] = await Promise.all([reverseGeocode(lat, lng, request.nextUrl.origin), nearestDeo(lat, lng).catch(() => null)]);
  return ok(place ? { ...place, nearestDeo: deo ? shortDeo(deo) : null } : null);
});
