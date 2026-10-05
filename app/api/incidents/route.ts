import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

/** Operator-confirmed incidents (each traceable to its source report). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  const { page, pageSize } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await store.listIncidents({ offset: (page - 1) * pageSize, limit: pageSize });
  return ok(
    result
      ? { storage: "ready" as const, items: result.items, total: result.total, page, pageSize, totalPages: Math.max(1, Math.ceil(result.total / pageSize)) }
      : { storage: "not_configured" as const, items: [], total: 0, page, pageSize, totalPages: 1 },
    { meta: { dataSource: store.kind } },
  );
});
