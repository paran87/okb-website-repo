import "server-only";
import { ApiError, BadRequestError, ConflictError, NotFoundError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getReportsConfig } from "@/features/reports/server/config";
import { ReportsBackendError } from "@/features/reports/server/store";
import type {
  ConsolidatedReport,
  ConsolidatedSettings,
  ConsolidatedSettingsInput,
  ScheduleEntry,
  ScheduleInput,
  TestPeriod,
} from "@/features/consolidated-reports/types";

/**
 * Server-side client for the OKB Bridge backend's consolidated-report endpoints. Uses the same
 * OKB_BRIDGE_API_URL / OKB_BRIDGE_ADMIN_TOKEN as report reviews; the token never reaches the browser.
 */

const log = logger.child({ module: "consolidated-reports" });

function bridge(): { url: string; token: string } {
  const cfg = getReportsConfig();
  if (!cfg.bridgeApiUrl || !cfg.bridgeAdminToken) {
    throw new ApiError(
      503,
      "INTERNAL_ERROR",
      "Automated reports need the OKB Bridge API. Set OKB_BRIDGE_API_URL and OKB_BRIDGE_ADMIN_TOKEN on the server.",
      { reason: "bridge_not_configured" },
    );
  }
  return { url: cfg.bridgeApiUrl, token: cfg.bridgeAdminToken };
}

async function call(path: string, init: RequestInit = {}, timeoutMs = 45_000): Promise<Response> {
  const { url, token } = bridge();
  let res: Response;
  try {
    res = await fetch(`${url}/api/v1/consolidated-reports${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
      cache: "no-store",
      // The bridge runs on a free Render instance that may need to wake up.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    log.error({ err, path }, "OKB Bridge consolidated-report request failed");
    throw new ReportsBackendError("The OKB Bridge backend did not respond. Try again in a minute.");
  }
  if (res.ok) return res;
  let message = "";
  try {
    message = ((await res.json()) as { error?: string }).error ?? "";
  } catch {
    /* non-JSON */
  }
  if (res.status === 400) throw new BadRequestError(message || "Invalid request");
  if (res.status === 404) throw new NotFoundError(message || "Consolidated report not found");
  if (res.status === 409) throw new ConflictError(message || "Not possible right now");
  if (res.status === 503 && message) {
    throw new ApiError(503, "INTERNAL_ERROR", message, { reason: "consolidated_storage_missing" });
  }
  log.error({ status: res.status, message, path }, "OKB Bridge consolidated-report request rejected");
  throw new ReportsBackendError("The OKB Bridge backend rejected the request.");
}

const json = async <T>(res: Response) => (await res.json()) as T;

export async function getSettings(): Promise<ConsolidatedSettings> {
  return json(await call("/settings"));
}

export async function saveSettings(settings: ConsolidatedSettingsInput, updatedBy: string): Promise<ConsolidatedSettings> {
  return json(await call("/settings", { method: "PUT", body: JSON.stringify({ settings, updatedBy }) }));
}

/** Rendering a PDF with photos can take a while on a cold backend. */
export async function testSend(createdBy: string, period: TestPeriod = {}): Promise<ConsolidatedReport> {
  return json(await call("/test", { method: "POST", body: JSON.stringify({ createdBy, ...period }) }, 55_000));
}

export async function listHistory(limit = 50): Promise<ConsolidatedReport[]> {
  return (await json<{ reports: ConsolidatedReport[] }>(await call(`?limit=${limit}`))).reports;
}

export async function resend(id: string): Promise<ConsolidatedReport> {
  return json(await call(`/${encodeURIComponent(id)}/resend`, { method: "POST" }));
}

/** Tries a FAILED automatic TEXT delivery again (the backend refuses one that was already sent). */
export async function retryText(id: string): Promise<ConsolidatedReport> {
  return json(await call(`/${encodeURIComponent(id)}/text-retry`, { method: "POST" }));
}

/** Stops a scheduled or retrying automatic TEXT delivery (the backend refuses one that was already sent). */
export async function cancelText(id: string): Promise<ConsolidatedReport> {
  return json(await call(`/${encodeURIComponent(id)}/text-cancel`, { method: "POST" }));
}

/** Removes a report from the history with its deliveries and PDF (409 while the phone is sending its text). */
export async function deleteReport(id: string): Promise<{ id: string; deleted: boolean }> {
  return json(await call(`/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

/** The report schedule, by date of sending. */
export async function listSchedules(): Promise<ScheduleEntry[]> {
  return (await json<{ schedules: ScheduleEntry[] }>(await call("/schedules"))).schedules;
}

export async function createSchedule(input: ScheduleInput, createdBy: string): Promise<ScheduleEntry> {
  return json(await call("/schedules", { method: "POST", body: JSON.stringify({ ...input, createdBy }) }));
}

/** Only an entry still waiting for its date of sending can be edited (the backend answers 409 otherwise). */
export async function updateSchedule(id: string, input: ScheduleInput): Promise<ScheduleEntry> {
  return json(await call(`/schedules/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }));
}

/** Removes an entry; a prepared report not yet sent is cancelled first (it stays in the history). */
export async function deleteSchedule(id: string): Promise<{ id: string; deleted: boolean }> {
  return json(await call(`/schedules/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export async function fetchPdf(id: string): Promise<{ bytes: ArrayBuffer; fileName: string }> {
  const res = await call(`/${encodeURIComponent(id)}/pdf`, {}, 55_000);
  const disposition = res.headers.get("content-disposition") ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "OKB_Consolidated_Flood_Report.pdf";
  return { bytes: await res.arrayBuffer(), fileName };
}
