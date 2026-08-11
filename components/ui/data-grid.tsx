"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";

export type SortDirection = "asc" | "desc";

export interface DataGridColumn<T> {
  id: string;
  header: ReactNode;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (columnId: string) => void;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string;
  className?: string;
}

/** Sortable, selectable data grid built on the Table primitives. */
export function DataGrid<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  emptyTitle = "No data",
  emptyDescription,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  selectedRowKey,
  className,
}: DataGridProps<T>) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-border">
        <Spinner label="Loading data…" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => {
            const isSorted = sortColumn === col.id;
            const SortIcon =
              !col.sortable || !onSort
                ? null
                : !isSorted
                  ? ArrowUpDown
                  : sortDirection === "asc"
                    ? ArrowUp
                    : ArrowDown;
            return (
              <TableHead key={col.id} className={col.headerClassName}>
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.id)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    {col.header}
                    {SortIcon ? (
                      <SortIcon className="size-3.5 opacity-60" aria-hidden />
                    ) : null}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const key = rowKey(row);
          const selected = selectedRowKey === key;
          return (
            <TableRow
              key={key}
              data-selected={selected}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.accessor(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        {data.length === 0 ? (
          <TableEmpty colSpan={columns.length} />
        ) : null}
      </TableBody>
    </Table>
  );
}
