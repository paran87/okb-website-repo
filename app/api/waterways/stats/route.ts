import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { fetchStats } from "@/features/waterways/services/arcgis";

export const maxDuration = 60;

/** River network totals, basin and discharge summaries, and the named rivers. */
export const GET = withApiHandler(async () => ok(await fetchStats()));
