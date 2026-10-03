import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { fetchLegend } from "@/features/waterways/services/arcgis";

export const maxDuration = 30;

/** Legend swatches for the hazard layers. */
export const GET = withApiHandler(async () => ok(await fetchLegend()));
