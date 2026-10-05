import type { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: NextRequest, { params }) => {
  const { store } = await requireReportsAccess(request);
  const id = (await params).id ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError("Incident not found");
  const incident = await store.getIncident(id);
  if (!incident) throw new NotFoundError("Incident not found");
  return ok(incident);
});
