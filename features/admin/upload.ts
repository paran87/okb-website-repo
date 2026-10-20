"use client";

import { AdminApiError, adminApi, jsonBody } from "@/features/admin/api";
import type { UploadTicket } from "@/features/admin/types";

/**
 * Uploads one file: the server hands out a signed link and the browser sends
 * the file straight to R2 (no size cap from this site). The server makes sure
 * the bucket allows this site (CORS) before it hands out the link; if the
 * bucket still refuses, files up to the server's limit go through the site.
 */

/** Why the browser could not reach storage, from what the server found when it made the upload link. */
function blockedMessage(state: UploadTicket["directUploads"]): string {
  if (state === "denied") {
    return "Files over 4 MB need a one-time setting in Cloudflare that this site's storage key is not allowed to make. Open Admin → Setup → Direct uploads, copy the rule and add it in Cloudflare.";
  }
  if (state === "error") return "The storage settings could not be checked just now. Please try again in a minute.";
  return "The upload was cut off before it reached storage. Check the connection and try again.";
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * put() with retries when the upload is blocked or the storage answers with a server error: a CORS rule the
 * server just added can take a few seconds to apply, and mobile connections drop.
 */
async function putRetrying(
  url: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
  delays = [2000, 5000],
): Promise<number> {
  let status = await put(url, file, contentType, onProgress, signal);
  for (const delay of delays) {
    if (status !== 0 && status < 500) break;
    onProgress(0);
    await wait(delay);
    status = await put(url, file, contentType, onProgress, signal);
  }
  return status;
}

export function put(
  url: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Parts of a multipart upload carry no content type (the upload has it).
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export async function uploadFile(
  collection: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const ticket = await adminApi<UploadTicket>("/api/admin/media/upload", {
    method: "POST",
    body: jsonBody({ collection, fileName: file.name, contentType: file.type, size: file.size }),
    signal,
  });

  const direct = await putRetrying(ticket.uploadUrl, file, ticket.contentType, onProgress, signal);
  if (direct >= 200 && direct < 300) {
    await adminApi("/api/admin/media/upload/complete", {
      method: "POST",
      body: jsonBody({ collection, key: ticket.key }),
      signal,
    });
    return ticket.key;
  }
  if (direct !== 0) throw new AdminApiError(`Storage rejected the upload (${direct}).`, direct, "storage_error");

  // Blocked before reaching R2 (usually CORS): small files can go through this site.
  if (file.size > ticket.proxyLimit) {
    throw new AdminApiError(blockedMessage(ticket.directUploads), 0, "cors_blocked");
  }
  onProgress(0);
  const proxied = await put(
    `/api/admin/media/upload?collection=${encodeURIComponent(collection)}&key=${encodeURIComponent(ticket.key)}`,
    file,
    ticket.contentType,
    onProgress,
    signal,
  );
  if (proxied < 200 || proxied >= 300) {
    throw new AdminApiError(proxied === 0 ? "Upload failed. Check your connection." : `Upload failed (${proxied}).`, proxied, null);
  }
  return ticket.key;
}

/** Parts sent at the same time, and the waits before each new try of a part that failed. */
const PARALLEL_PARTS = 4;
const PART_RETRY_DELAYS = [1000, 3000, 6000];

/**
 * Sends a file's parts to their signed links, PARALLEL_PARTS at a time; a part that fails is sent again after
 * each of PART_RETRY_DELAYS. Throws with the last status when a part cannot be sent (0: blocked before reaching R2).
 */
async function putParts(
  file: Blob,
  multipart: NonNullable<UploadTicket["multipart"]>,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const loaded = new Array<number>(multipart.partUrls.length).fill(0);
  const report = () => onProgress(Math.min(1, loaded.reduce((a, b) => a + b, 0) / file.size));
  let next = 0;
  const worker = async () => {
    while (next < multipart.partUrls.length) {
      const i = next++;
      const slice = file.slice(i * multipart.partSize, Math.min(file.size, (i + 1) * multipart.partSize));
      let status = 0;
      for (let attempt = 0; attempt <= PART_RETRY_DELAYS.length; attempt++) {
        if (attempt) await wait(PART_RETRY_DELAYS[attempt - 1] as number);
        status = await put(multipart.partUrls[i] as string, slice, "", (f) => {
          loaded[i] = f * slice.size;
          report();
        }, signal);
        if (status >= 200 && status < 300) break;
        loaded[i] = 0;
        report();
      }
      if (status < 200 || status >= 300) throw new AdminApiError(status ? `Storage rejected part ${i + 1} (${status}).` : "blocked", status, status ? "storage_error" : "cors_blocked");
      loaded[i] = slice.size;
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_PARTS, multipart.partUrls.length) }, worker));
}

/**
 * Adds one photo or video to a flood report (Admin → Reports), the same way: straight to R2 (large files in
 * parts sent side by side), or through this site for small files when the bucket does not allow direct uploads yet.
 */
export async function uploadReportMedia(
  reportId: string,
  file: Blob & { name?: string },
  fileName: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const base = `/api/admin/mobile-reports/${encodeURIComponent(reportId)}/media`;
  const ticket = await adminApi<UploadTicket>(base, {
    method: "POST",
    body: jsonBody({ fileName, contentType: file.type, size: file.size }),
    signal,
  });
  if (ticket.multipart) {
    const { uploadId, partUrls } = ticket.multipart;
    try {
      await putParts(file, ticket.multipart, onProgress, signal);
    } catch (err) {
      // Drop the parts already sent (also when the operator cancelled).
      void adminApi(`${base}/complete`, { method: "POST", body: jsonBody({ key: ticket.key, uploadId, abort: true }) }).catch(() => undefined);
      if (err instanceof AdminApiError && err.reason === "cors_blocked") {
        throw new AdminApiError(blockedMessage(ticket.directUploads), 0, "cors_blocked");
      }
      throw err;
    }
    await adminApi(`${base}/complete`, { method: "POST", body: jsonBody({ key: ticket.key, uploadId, partCount: partUrls.length }), signal });
    return ticket.key;
  }
  const direct = await putRetrying(ticket.uploadUrl, file, ticket.contentType, onProgress, signal);
  if (direct >= 200 && direct < 300) {
    await adminApi(`${base}/complete`, { method: "POST", body: jsonBody({ key: ticket.key }), signal });
    return ticket.key;
  }
  if (direct !== 0) throw new AdminApiError(`Storage rejected the upload (${direct}).`, direct, "storage_error");
  if (file.size > ticket.proxyLimit) {
    throw new AdminApiError(blockedMessage(ticket.directUploads), 0, "cors_blocked");
  }
  onProgress(0);
  const proxied = await put(`${base}?key=${encodeURIComponent(ticket.key)}`, file, ticket.contentType, onProgress, signal);
  if (proxied < 200 || proxied >= 300) {
    throw new AdminApiError(proxied === 0 ? "Upload failed. Check your connection." : `Upload failed (${proxied}).`, proxied, null);
  }
  return ticket.key;
}
