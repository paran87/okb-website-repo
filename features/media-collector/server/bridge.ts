import "server-only";
import { ApiError, BadRequestError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { CollectorStatus } from "@/features/media-collector/types";
import { getReportsConfig } from "@/features/reports/server/config";
import { ReportsBackendError } from "@/features/reports/server/store";

/**
 * OKB bridge backend endpoints for the OKB Media Collector (status and pause flags), with the same
 * OKB_BRIDGE_API_URL / OKB_BRIDGE_ADMIN_TOKEN as the other settings; the token never reaches the browser.
 */

const log = logger.child({ module: "media-collector.bridge" });

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const cfg = getReportsConfig();
  if (!cfg.bridgeApiUrl || !cfg.bridgeAdminToken) {
    throw new ApiError(
      503,
      "INTERNAL_ERROR",
      "Set OKB_BRIDGE_API_URL and OKB_BRIDGE_ADMIN_TOKEN on the server.",
      {
        reason: "bridge_not_configured",
      },
    );
  }
  let res: Response;
  try {
    res = await fetch(`${cfg.bridgeApiUrl}/api/v1/collector${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.bridgeAdminToken}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
      // The bridge runs on a free Render instance that may need to wake up.
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    log.error({ err, path }, "OKB bridge collector request failed");
    throw new ReportsBackendError(
      "The OKB Bridge backend did not respond. Try again in a minute.",
    );
  }
  if (res.ok) return res;
  const message =
    ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
  if (res.status === 400)
    throw new BadRequestError(message || "Invalid request");
  if (res.status === 503 && message)
    throw new ApiError(503, "INTERNAL_ERROR", message, {
      reason: "collector_storage_missing",
    });
  if (res.status === 404) {
    throw new ApiError(
      503,
      "INTERNAL_ERROR",
      "This OKB Bridge backend version has no media collector support yet.",
      {
        reason: "collector_not_deployed",
      },
    );
  }
  log.error(
    { status: res.status, path },
    "OKB bridge collector request rejected",
  );
  throw new ReportsBackendError("The OKB Bridge backend rejected the request.");
}

export async function getCollectorStatus(): Promise<CollectorStatus> {
  return (await call("/status")).json() as Promise<CollectorStatus>;
}

export async function setPaused(
  patch: { whatsappPaused?: boolean; viberPaused?: boolean },
  updatedBy: string,
): Promise<CollectorStatus["settings"]> {
  return (
    await call("/settings", {
      method: "PUT",
      body: JSON.stringify({ ...patch, updatedBy }),
    })
  ).json() as Promise<CollectorStatus["settings"]>;
}
