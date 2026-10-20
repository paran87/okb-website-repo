import type {
  FloodReportFormValues,
  FloodReportInput,
  MyFloodReport,
  PlaceName,
  PublicFloodReportList,
  SubmittedReport,
  UploadedPhoto,
} from "../types";

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

export function sendReport(input: FloodReportInput): Promise<SubmittedReport> {
  return call("/api/flood-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** The reports this phone sent (checked with the edit keys it kept). */
export function fetchMyReports(items: { id: string; token: string }[]): Promise<MyFloodReport[]> {
  if (!items.length) return Promise.resolve([]);
  return call("/api/flood-reports/mine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
}

/** Saves the edited form and photo list of one of this phone's reports. */
export function updateReport(
  id: string,
  token: string,
  values: FloodReportFormValues,
  photos: UploadedPhoto[],
): Promise<MyFloodReport> {
  return call(`/api/flood-reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, photos, token }),
  });
}

export function deleteReport(id: string, token: string): Promise<{ deleted: boolean }> {
  return call(`/api/flood-reports/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
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

function putBlob(url: string, blob: Blob, contentType: string, onProgress: (fraction: number) => void): Promise<number> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.send(blob);
  });
}

/**
 * Uploads the report's video with progress (0–1) and resolves to its storage key. The video goes straight to
 * storage with a signed link (it is too large for this site); a small one goes through the site when the
 * phone cannot reach storage directly. Retried once after a few seconds when the upload is cut off.
 */
export async function uploadVideo(reportId: string, video: Blob, onProgress: (fraction: number) => void): Promise<string> {
  const ticket = await call<{ key: string; uploadUrl: string; contentType: string; proxyLimit: number }>("/api/flood-reports/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, size: video.size, contentType: video.type || "video/mp4" }),
  });
  let status = await putBlob(ticket.uploadUrl, video, ticket.contentType, onProgress);
  if (status === 0 || status >= 500) {
    onProgress(0);
    await new Promise((r) => setTimeout(r, 3000));
    status = await putBlob(ticket.uploadUrl, video, ticket.contentType, onProgress);
  }
  if (status >= 200 && status < 300) {
    onProgress(1);
    return ticket.key;
  }
  if (status === 0 && video.size <= ticket.proxyLimit) {
    onProgress(0);
    const proxied = await putBlob(
      `/api/flood-reports/videos?reportId=${encodeURIComponent(reportId)}&key=${encodeURIComponent(ticket.key)}`,
      video,
      ticket.contentType,
      onProgress,
    );
    if (proxied >= 200 && proxied < 300) return ticket.key;
  }
  throw new FloodReportApiError(
    status === 0 ? "The video could not be uploaded. Check your signal and try again, or send the report with photos only." : `The video upload failed (${status}). Please try again.`,
    status,
  );
}
