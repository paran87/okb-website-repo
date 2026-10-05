"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchBox } from "@/components/ui/search-box";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import type { ReportFacets, ReportListQuery } from "@/features/reports/types";
import { useReportFacets } from "@/features/reports/hooks/use-reports";
import {
  DATE_PRESET_OPTIONS,
  platformLabel,
  REPORT_TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "@/features/reports/lib/labels";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Text input that reports its value after a short pause. */
function DebouncedSearch({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const debounced = useDebounced(text, 350);
  useEffect(() => {
    if (debounced !== value) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commit only when the debounced text changes
  }, [debounced]);
  useEffect(() => setText(value), [value]);
  return <SearchBox value={text} onChange={setText} placeholder={placeholder} className={className} aria-label={placeholder} />;
}

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "viber", label: "Viber" },
];

function options(all: string, values: string[]): SelectOption[] {
  return [{ value: "all", label: all }, ...values.map((v) => ({ value: v, label: v }))];
}

function groupOptions(facets: ReportFacets | undefined, platform: string | undefined): SelectOption[] {
  const groups = (facets?.groups ?? []).filter((g) => !platform || platform === "all" || g.platform === platform);
  return [
    { value: "all", label: "All Groups" },
    ...groups.map((g) => ({ value: g.name, label: `${g.name} · ${platformLabel(g.platform)}` })),
  ];
}

interface ReportFiltersProps {
  value: ReportListQuery;
  onChange: (patch: Partial<ReportListQuery>) => void;
  onReset: () => void;
  variant: "incoming" | "archive";
}

export function ReportFilters({ value, onChange, onReset, variant }: ReportFiltersProps) {
  const facets = useReportFacets();
  const [moreOpen, setMoreOpen] = useState(variant === "archive");
  const [mobileOpen, setMobileOpen] = useState(false);
  const f = facets.data;
  const groupOpts = useMemo(() => groupOptions(f, value.platform), [f, value.platform]);
  const set = (patch: Partial<ReportListQuery>) => onChange({ ...patch, page: 1 });

  const activeCount = [
    value.platform,
    value.group,
    value.status,
    value.reportType,
    value.region,
    value.province,
    value.municipality,
    value.office,
    value.location,
  ].filter((v) => v && v !== "all").length;

  return (
    <div className="space-y-3 rounded-card border border-border bg-card p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <DebouncedSearch
          value={value.q ?? ""}
          onCommit={(q) => set({ q })}
          placeholder={
            variant === "archive"
              ? "Search history: text, sender, group, office, location, RPT-…"
              : "Search reports: text, sender, group, location, report ID"
          }
          className="flex-1"
        />
        <div role="radiogroup" aria-label="Source" className="flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5">
          {SOURCES.map((s) => {
            const active = (value.platform ?? "all") === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ platform: s.value, group: "all" })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-caption font-semibold transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          leftIcon={<SlidersHorizontal className="size-4" aria-hidden />}
          aria-expanded={mobileOpen}
        >
          Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </div>

      <div className={cn("space-y-3", mobileOpen ? "block" : "hidden lg:block")}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select options={groupOpts} value={value.group ?? "all"} onChange={(group) => set({ group })} placeholder="All Groups" />
          <Select
            options={DATE_PRESET_OPTIONS}
            value={value.datePreset ?? "all"}
            onChange={(datePreset) => set({ datePreset: datePreset as ReportListQuery["datePreset"] })}
          />
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={value.status ?? "all"}
            onChange={(status) => set({ status: status as ReportListQuery["status"] })}
          />
          <Select options={REPORT_TYPE_FILTER_OPTIONS} value={value.reportType ?? "all"} onChange={(reportType) => set({ reportType })} />
        </div>

        {value.datePreset === "custom" ? (
          <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            <label className="flex items-center gap-2">
              From
              <Input type="date" value={value.from ?? ""} onChange={(e) => set({ from: e.target.value })} className="h-9 w-auto" />
            </label>
            <label className="flex items-center gap-2">
              To
              <Input type="date" value={value.to ?? ""} onChange={(e) => set({ to: e.target.value })} className="h-9 w-auto" />
            </label>
            <span>(Philippine time, by date received)</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
          >
            <ChevronDown className={cn("size-4 transition-transform", moreOpen && "rotate-180")} aria-hidden />
            Location &amp; office filters
          </button>
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="size-3.5" aria-hidden />}>
            Reset filters
          </Button>
        </div>

        {moreOpen ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select options={options("All Regions", f?.regions ?? [])} value={value.region ?? "all"} onChange={(region) => set({ region })} />
              <Select
                options={options("All Provinces", f?.provinces ?? [])}
                value={value.province ?? "all"}
                onChange={(province) => set({ province })}
              />
              <Select
                options={options("All Municipalities", f?.municipalities ?? [])}
                value={value.municipality ?? "all"}
                onChange={(municipality) => set({ municipality })}
              />
              <Select options={options("All Offices / DEOs", f?.offices ?? [])} value={value.office ?? "all"} onChange={(office) => set({ office })} />
            </div>
            {variant === "archive" ? (
              <DebouncedLocation value={value.location ?? ""} onCommit={(location) => set({ location })} />
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Region, province, municipality and office values come from what the AI extracted from each report; reports
              that do not state them are only found by the unfiltered view or by search.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DebouncedLocation({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value);
  const debounced = useDebounced(text, 350);
  useEffect(() => {
    if (debounced !== value) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commit only when the debounced text changes
  }, [debounced]);
  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Monitored location (e.g. Tayuman, España, Balibago)"
      aria-label="Monitored location"
      leftIcon={<MapPin className="size-4" aria-hidden />}
    />
  );
}
