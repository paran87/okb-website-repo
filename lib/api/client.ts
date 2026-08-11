import type { ApiResponseBody } from "@/types/api";
import type { ApiErrorCode } from "@/lib/api/errors";

/** Error thrown by the client fetch helper when the API returns a failure. */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Typed fetch wrapper that unwraps the standard API envelope and throws a
 * structured `ApiClientError` on failure. Use from React Query hooks.
 */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await response.json()) as ApiResponseBody<T>;

  if (!body.success) {
    throw new ApiClientError(
      response.status,
      body.error.code,
      body.error.message,
      body.error.details,
    );
  }

  return body.data;
}
