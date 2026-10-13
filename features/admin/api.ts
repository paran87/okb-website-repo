"use client";

/** Browser-side calls to /api/admin/* (same-origin, cookie auth). */

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason: string | null,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string; details?: { reason?: string } };
}

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new AdminApiError("The server could not be reached. Check your connection.", 0, "network");
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !body?.success) {
    throw new AdminApiError(
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error?.details?.reason ?? null,
    );
  }
  return body.data as T;
}

export function jsonBody(value: unknown): RequestInit["body"] {
  return JSON.stringify(value);
}
