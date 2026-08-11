"use client";

import { ChevronRight, MapPin, Search } from "lucide-react";
import type { DeosFloodProneArea } from "@/features/flood-prone/types";
import { cn } from "@/utils/cn";

interface FloodProneAreaListProps {
  areas: DeosFloodProneArea[];
  deoOptions: string[];
  selectedId: string | null;
  search: string;
  deoFilter: string;
  onSearchChange: (value: string) => void;
  onDeoFilterChange: (value: string) => void;
  onSelect: (area: DeosFloodProneArea) => void;
  className?: string;
}

/** Scrollable sidebar list of DEOS flood-prone road sections. */
export function FloodProneAreaList({
  areas,
  deoOptions,
  selectedId,
  search,
  deoFilter,
  onSearchChange,
  onDeoFilterChange,
  onSelect,
  className,
}: FloodProneAreaListProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface/95 backdrop-blur-sm",
        className,
      )}
    >
      <div className="space-y-3 border-b border-border p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Flood-Prone Areas
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            DEOS Updated List 2026 — {areas.length} road sections
          </p>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search road or DEO…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </label>

        <select
          value={deoFilter}
          onChange={(e) => onDeoFilterChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
        >
          <option value="all">All DEOs</option>
          {deoOptions.map((deo) => (
            <option key={deo} value={deo}>
              {deo}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {areas.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No areas match your filters.
          </p>
        ) : (
          <ul className="space-y-1">
            {areas.map((area) => (
              <li key={area.id}>
                <button
                  type="button"
                  onClick={() => onSelect(area)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left transition-colors",
                    selectedId === area.id
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-muted/60 text-foreground/90",
                  )}
                >
                  <MapPin
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      selectedId === area.id
                        ? "text-primary"
                        : "text-red-500",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {area.deo} · #{area.index}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug">
                      {area.description}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
