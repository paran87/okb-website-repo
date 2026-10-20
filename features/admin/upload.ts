"use client";

import { AdminApiError, adminApi, jsonBody } from "@/features/admin/api";
import type { UploadTicket } from "@/features/admin/types";

/**
 * Uploads one file: the server hands out a signed link and the browser sends
 * the file straight to R2 (no size cap from this site). When the bucket does
 * not allow this site yet (CORS), files up to the server's limit go through
 * the site instead.
 */

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

  const direct = await put(ticket.uploadUrl, file, ticket.contentType, onProgress, signal);
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
    throw new AdminApiError(
      "Large files need direct uploads. Turn them on under Media → Direct uploads, then retry.",
      0,
      "cors_blocked",
    );
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

/** Parts sent at the same time, and tries per part. */
const PARALLEL_PARTS = 4;
const PART_TRIES = 3;

/**
 * Sends a file's parts to their signed links, PARALLEL_PARTS at a time; a part that fails is sent again (up to
 * PART_TRIES). Throws with the last status when a part cannot be sent (0: blocked before reaching R2).
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
      for (let attempt = 1; attempt <= PART_TRIES; attempt++) {
        status = await put(multipart.partUrls[i] as string, slice, "", (f) => {
          loaded[i] = f * slice.size;
          report();
        }, signal);
        if (status >= 200 && status < 300) break;
        loaded[i] = 0;
        if (attempt < PART_TRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
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
        throw new AdminApiError("Large videos need direct uploads. Turn them on under Media → Direct uploads, then retry.", 0, "cors_blocked");
      }
      throw err;
    }
    await adminApi(`${base}/complete`, { method: "POST", body: jsonBody({ key: ticket.key, uploadId, partCount: partUrls.length }), signal });
    return ticket.key;
  }
  const direct = await put(ticket.uploadUrl, file, ticket.contentType, onProgress, signal);
  if (direct >= 200 && direct < 300) {
    await adminApi(`${base}/complete`, { method: "POST", body: jsonBody({ key: ticket.key }), signal });
    return ticket.key;
  }
  if (direct !== 0) throw new AdminApiError(`Storage rejected the upload (${direct}).`, direct, "storage_error");
  if (file.size > ticket.proxyLimit) {
    throw new AdminApiError(
      "Large videos need direct uploads. Turn them on under Media → Direct uploads, then retry.",
      0,
      "cors_blocked",
    );
  }
  onProgress(0);
  const proxied = await put(`${base}?key=${encodeURIComponent(ticket.key)}`, file, ticket.contentType, onProgress, signal);
  if (proxied < 200 || proxied >= 300) {
    throw new AdminApiError(proxied === 0 ? "Upload failed. Check your connection." : `Upload failed (${proxied}).`, proxied, null);
  }
  return ticket.key;
}
