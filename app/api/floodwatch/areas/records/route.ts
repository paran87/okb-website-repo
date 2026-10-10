import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { floodwatchService } from "@/features/floodwatch/services/floodwatch.service";

/** Every Flood Prone Areas (Floodwatch) row, located or not, for placing on the road network. */
export const GET = withApiHandler(async () => ok(await floodwatchService.getAreas()));
