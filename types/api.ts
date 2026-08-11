import type {
  ApiResponseBody,
  ApiSuccess,
  ApiFailure,
  ResponseMeta,
} from "@/lib/api/response";

export type { ApiResponseBody, ApiSuccess, ApiFailure, ResponseMeta };

/** Standard pagination query parameters accepted by list endpoints. */
export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  meta: Required<Pick<ResponseMeta, "page" | "pageSize" | "total" | "totalPages">>;
}
