import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/** Public liveness/readiness probe. Reports app + database connectivity. */
export const GET = withApiHandler(async () => {
  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  return ok(
    {
      status: database === "up" ? "healthy" : "degraded",
      services: { app: "up", database },
      timestamp: new Date().toISOString(),
    },
    { status: database === "up" ? 200 : 503 },
  );
});
