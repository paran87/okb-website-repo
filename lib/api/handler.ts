import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a route handler with structured logging and centralized error handling.
 *
 * Guarantees:
 * - Every request gets a correlation id (echoed back via `x-request-id`).
 * - Expected `ApiError`s are logged at `warn`; unexpected errors at `error`
 *   (with stack) but never leaked to the client.
 */
export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const log = logger.child({
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });

    try {
      const response = await handler(request, context);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        log.warn({ code: error.code, status: error.statusCode }, error.message);
      } else {
        log.error({ err: error }, "Unhandled route error");
      }
      const response = toErrorResponse(error);
      response.headers.set("x-request-id", requestId);
      return response;
    }
  };
}
