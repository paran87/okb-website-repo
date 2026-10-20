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
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
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

/**
 * Adds one photo or video to a flood report (Admin → Reports), the same way: straight to R2, or through this
 * site for small files when the bucket does not allow direct uploads yet.
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
  const direct = await put(ticket.uploadUrl, file as File, ticket.contentType, onProgress, signal);
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
  const proxied = await put(`${base}?key=${encodeURIComponent(ticket.key)}`, file as File, ticket.contentType, onProgress, signal);
  if (proxied < 200 || proxied >= 300) {
    throw new AdminApiError(proxied === 0 ? "Upload failed. Check your connection." : `Upload failed (${proxied}).`, proxied, null);
  }
  return ticket.key;
}
