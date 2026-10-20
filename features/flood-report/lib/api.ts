import type { FloodReportInput, PlaceName, PublicFloodReport, PublicFloodReportList } from "../types";

/** Browser calls to the Command Center's /api/flood-reports/* routes. */

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string; details?: { issues?: { message: string }[] } };
}

export class FloodReportApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "FloodReportApiError";
  }
}

function errorMessage(body: Envelope<unknown> | null, status: number): string {
  const issue = body?.error?.details?.issues?.[0]?.message;
  if (issue && issue !== "Required") return issue;
  if (body?.error?.message && body.error.message !== "Validation failed") return body.error.message;
  if (status === 413) return "The photo is too large.";
  if (status === 0) return "No internet connection. Check your signal and try again.";
  return "Something went wrong. Please try again.";
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new FloodReportApiError(errorMessage(null, 0), 0);
  }
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success) throw new FloodReportApiError(errorMessage(body, res.status), res.status);
  return body.data as T;
}

export function fetchReports(hours: number): Promise<PublicFloodReportList> {
  return call(`/api/flood-reports?hours=${hours}`, { cache: "no-store" });
}

export function fetchPlace(lat: number, lng: number): Promise<PlaceName | null> {
  return call(`/api/flood-reports/geocode?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`);
}

export function sendReport(input: FloodReportInput): Promise<PublicFloodReport> {
  return call("/api/flood-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Uploads one photo with progress (0–1); resolves to its storage key. */
export function uploadPhoto(reportId: string, photo: Blob, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("reportId", reportId);
    form.append("photo", photo, "photo.jpg");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/flood-reports/photos");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: Envelope<{ key: string }> | null = null;
      try {
        body = JSON.parse(xhr.responseText) as Envelope<{ key: string }>;
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.success && body.data) {
        onProgress(1);
        resolve(body.data.key);
      } else {
        reject(new FloodReportApiError(errorMessage(body, xhr.status), xhr.status));
      }
    };
    xhr.onerror = () => reject(new FloodReportApiError(errorMessage(null, 0), 0));
    xhr.send(form);
  });
}
