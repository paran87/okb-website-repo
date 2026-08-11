"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  className?: string;
}

function pageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

/** Accessible pagination control for tables and data grids. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  className,
}: PaginationProps) {
  const pages = pageRange(page, totalPages);
  const from = totalItems && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to =
    totalItems && pageSize
      ? Math.min(page * pageSize, totalItems)
      : undefined;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {totalItems !== undefined && from !== undefined && to !== undefined ? (
        <p className="text-caption text-muted-foreground">
          Showing {from}–{to} of {totalItems}
        </p>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          leftIcon={<ChevronLeft className="size-4" aria-hidden />}
        >
          Prev
        </Button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-caption text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-caption font-medium transition-colors",
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p}
            </button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          rightIcon={<ChevronRight className="size-4" aria-hidden />}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
