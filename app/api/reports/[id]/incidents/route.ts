import type { NextRequest } from "next/server";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { invalidateAggregates } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  incidentType: z.enum(["flooding", "road_obstruction", "high_water_level", "infrastructure_damage", "drainage_clogging", "other"]),
  severity: z.enum(["low", "moderate", "high", "critical"]),
  sourceLocationIndex: z.number().int().min(0).max(500).nullable().optional().transform((v) => v ?? null),
  locationText: nullableText(300),
  region: nullableText(120),
  province: nullableText(120),
  municipality: nullableText(120),
  description: nullableText(4000),
});

/**
 * Operator-confirmed incident created from a report. Never automatic: this is
 * only called from the "Create Incident" form. The incident stores report_id
 * for traceability back to the original WhatsApp/Viber message.
 */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  const { store, operatorName } = await requireReportsAccess(request, { mutating: true });
  const id = (await params).id ?? "";
  const input = createSchema.parse(await request.json());
  const report = await store.getReport(id);
  if (!report) throw new NotFoundError("Report not found");
  if (report.status === "processing") throw new ConflictError("Wait for AI processing to finish before creating an incident.");
  const incident = await store.createIncident(id, input, operatorName);
  invalidateAggregates();
  return created(incident);
});
