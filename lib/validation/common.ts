import { z } from "zod";

/** Reusable Zod schemas for API request validation. */

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid resource identifier"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Coordinate validation shared by all geospatial inputs. */
export const coordinatesSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

/**
 * Parse `URLSearchParams` (or any record) against a Zod schema. Throws a
 * `ZodError` on failure, which `withApiHandler` converts to a 422 response.
 */
export function parseQuery<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  searchParams: URLSearchParams,
): z.infer<TSchema> {
  return schema.parse(Object.fromEntries(searchParams.entries()));
}
