import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, type ApiErrorCode } from "@/lib/api/errors";

/**
 * Consistent API response envelope used by every route handler.
 *
 * Success: { success: true, data, meta? }
 * Error:   { success: false, error: { code, message, details? } }
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

export interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: ResponseMeta },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true, data, ...(init?.meta ? { meta: init.meta } : {}) },
    { status: init?.status ?? 200 },
  );
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function failure(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

/**
 * Convert any thrown value into a safe API error response.
 *
 * - ZodError -> 422 with field-level issues.
 * - ApiError -> its declared status/code.
 * - Anything else -> generic 500 (internal message is NEVER exposed).
 */
export function toErrorResponse(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ZodError) {
    return failure(422, "VALIDATION_ERROR", "Validation failed", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof ApiError) {
    return failure(error.statusCode, error.code, error.message, error.details);
  }

  return failure(
    500,
    "INTERNAL_ERROR",
    "An unexpected error occurred. Please try again later.",
  );
}
