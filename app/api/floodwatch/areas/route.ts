import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { floodwatchService } from "@/features/floodwatch/services/floodwatch.service";

/** Flood Prone Areas (Floodwatch) as GeoJSON points for the map. */
export const GET = withApiHandler(async () => ok(await floodwatchService.getAreasGeoJson()));
