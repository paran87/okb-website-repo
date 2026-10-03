"use client";

import type { ReactNode } from "react";
import {
  Building2,
  Download,
  Layers,
  MapPin,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type {
  FilterOptions,
  RoadStats,
} from "@/features/road-network/lib/filter";
import {
  ALL,
  CLASS_META,
  EXPRESSWAY_COLOR,
  type ExpresswayFeature,
  type RoadClass,
  type RoadFeature,
  type RoadFilters,
} from "@/features/road-network/types";

const km = (value: number) =>
  value >= 100
    ? Math.round(value).toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

const selectClass =
  "h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring";

function Switch({
  checked,
  onChange,
  label,
  color,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  color: string;
  hint?: string;
}) {
  return (
    <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-primary size-3.5"
      />
      <span
        className="h-1.5 w-4 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-foreground min-w-0 flex-1 truncate">{label}</span>
      {hint ? (
        <span className="text-muted-foreground font-mono text-[11px]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

interface FiltersPanelProps {
  filters: RoadFilters;
  options: FilterOptions;
  stats: RoadStats;
  expresswayCount: number;
  expresswayKm: number;
  showExpressways: boolean;
  showFlood: boolean;
  showIncidents: boolean;
  floodCount: number | null;
  active: boolean;
  onChange: (next: Partial<RoadFilters>) => void;
  onToggleClass: (cls: RoadClass) => void;
  onToggleExpressways: () => void;
  onToggleFlood: () => void;
  onToggleIncidents: () => void;
  onReset: () => void;
  className?: string;
}

/** Search, location filters, class toggles and context overlays. */
export function FiltersPanel(p: FiltersPanelProps) {
  const { filters, options, stats } = p;
  return (
    <section
      aria-label="Road filters"
      className={cn(
        "glass border-border/60 shadow-panel pointer-events-auto flex min-h-0 flex-col overflow-y-auto rounded-xl border",
        p.className,
      )}
    >
      <div className="space-y-2 p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => p.onChange({ query: e.target.value })}
            placeholder="Search road, route, ID, province…"
            aria-label="Search roads"
            className="border-border bg-background focus:ring-ring h-8 w-full rounded-md border pr-2 pl-8 text-xs outline-none focus:ring-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Island"
            value={filters.island}
            onChange={(e) =>
              p.onChange({
                island: e.target.value,
                region: ALL,
                province: ALL,
                deo: ALL,
              })
            }
            className={selectClass}
          >
            <option value={ALL}>All islands</option>
            {options.islands.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Region"
            value={filters.region}
            onChange={(e) =>
              p.onChange({ region: e.target.value, province: ALL, deo: ALL })
            }
            className={selectClass}
          >
            <option value={ALL}>All regions</option>
            {options.regions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Province"
            value={filters.province}
            onChange={(e) => p.onChange({ province: e.target.value, deo: ALL })}
            className={selectClass}
          >
            <option value={ALL}>All provinces</option>
            {options.provinces.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="District Engineering Office"
            value={filters.deo}
            onChange={(e) => p.onChange({ deo: e.target.value })}
            className={selectClass}
          >
            <option value={ALL}>All DEOs</option>
            {options.deos.map((v) => (
              <option key={v} value={v}>
                {v.replace(/ District Engineering Office$/, "")}
              </option>
            ))}
          </select>
        </div>
        {p.active ? (
          <button
            type="button"
            onClick={p.onReset}
            className="text-primary inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
          >
            <X className="size-3" aria-hidden /> Clear filters
          </button>
        ) : null}
      </div>

      <div className="border-border/60 space-y-0.5 border-t p-2">
        <p className="text-muted-foreground px-1.5 pb-1 text-[10px] font-semibold tracking-wide uppercase">
          Road class
        </p>
        {(Object.keys(CLASS_META) as RoadClass[]).map((cls) => (
          <Switch
            key={cls}
            checked={filters.classes[cls]}
            onChange={() => p.onToggleClass(cls)}
            label={CLASS_META[cls].label}
            color={CLASS_META[cls].color}
            hint={`${km(stats.byClass[cls].km)} km`}
          />
        ))}
        <Switch
          checked={p.showExpressways}
          onChange={p.onToggleExpressways}
          label="Expressways"
          color={EXPRESSWAY_COLOR}
          hint={`${km(p.expresswayKm)} km`}
        />
      </div>

      <div className="border-border/60 space-y-0.5 border-t p-2">
        <p className="text-muted-foreground px-1.5 pb-1 text-[10px] font-semibold tracking-wide uppercase">
          Flood context
        </p>
        <Switch
          checked={p.showFlood}
          onChange={p.onToggleFlood}
          label="Flood-prone areas (mapped)"
          color="#7c3aed"
          hint={p.floodCount === null ? "…" : p.floodCount.toLocaleString()}
        />
        <Switch
          checked={p.showIncidents}
          onChange={p.onToggleIncidents}
          label="Active incidents (NCR)"
          color="#e11d48"
        />
      </div>
    </section>
  );
}

interface InsightsPanelProps {
  stats: RoadStats;
  scope: "region" | "province" | "deo";
  matches: RoadFeature[];
  active: boolean;
  onPickScope: (label: string) => void;
  onPickRoad: (road: RoadFeature) => void;
  onExport: () => void;
  className?: string;
}

/** Totals, class split, ranked breakdown and the matching sections list. */
export function InsightsPanel({
  stats,
  scope,
  matches,
  active,
  onPickScope,
  onPickRoad,
  onExport,
  className,
}: InsightsPanelProps) {
  const rows =
    scope === "region"
      ? stats.topRegions
      : scope === "province"
        ? stats.topProvinces
        : stats.topDeos;
  const heading =
    scope === "region"
      ? "Length by region"
      : scope === "province"
        ? "Length by province"
        : "Length by DEO";
  const max = Math.max(...rows.map((r) => r.km), 1);
  const classTotal = Math.max(stats.km, 1);
  const longest = [...matches]
    .sort((a, b) => b.properties.len - a.properties.len)
    .slice(0, 40);

  return (
    <aside
      aria-label="Road network insights"
      className={cn(
        "glass border-border/60 shadow-panel pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-xl border",
        className,
      )}
    >
      <div className="divide-border/60 min-h-0 flex-1 divide-y overflow-y-auto">
        <section className="space-y-2 p-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-foreground font-mono text-xl leading-none font-semibold">
                {km(stats.km)} km
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {stats.sections.toLocaleString()} road sections
                {active ? " match" : " nationwide"}
              </p>
            </div>
            <button
              type="button"
              onClick={onExport}
              disabled={matches.length === 0}
              className="border-border/60 text-foreground hover:bg-muted/60 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium disabled:opacity-50"
            >
              <Download className="size-3" aria-hidden /> CSV
            </button>
          </div>
          <div
            className="bg-muted flex h-2 overflow-hidden rounded-full"
            aria-hidden
          >
            {(Object.keys(CLASS_META) as RoadClass[]).map((cls) => (
              <span
                key={cls}
                style={{
                  width: `${(stats.byClass[cls].km / classTotal) * 100}%`,
                  backgroundColor: CLASS_META[cls].color,
                }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-3 gap-1 text-[11px]">
            {(Object.keys(CLASS_META) as RoadClass[]).map((cls) => (
              <li key={cls}>
                <p className="text-muted-foreground">{CLASS_META[cls].label}</p>
                <p className="text-foreground font-mono">
                  {km(stats.byClass[cls].km)} km
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1.5 p-3">
          <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <Building2 className="text-primary size-3.5" aria-hidden />
            {heading}
          </h3>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.label}>
                <button
                  type="button"
                  onClick={() => onPickScope(row.label)}
                  className="block w-full text-left"
                  title={`Filter to ${row.label}`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
                    <span className="text-foreground min-w-0 truncate">
                      {row.label.replace(/ District Engineering Office$/, "")}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono">
                      {km(row.km)} km
                    </span>
                  </span>
                  <span className="bg-muted mt-0.5 block h-1 overflow-hidden rounded-full">
                    <span
                      className="bg-primary block h-full rounded-full"
                      style={{ width: `${(row.km / max) * 100}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1.5 p-3">
          <h3 className="text-foreground text-xs font-semibold">
            Longest sections{matches.length > 40 ? " (top 40)" : ""}
          </h3>
          {longest.length === 0 ? (
            <p className="text-muted-foreground text-[11px]">
              No roads match these filters.
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {longest.map((road) => (
              <li key={road.properties.id}>
                <button
                  type="button"
                  onClick={() => onPickRoad(road)}
                  className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px]"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: CLASS_META[road.properties.cls].color,
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate">
                      {road.properties.name}
                    </span>
                    <span className="text-muted-foreground block truncate">
                      {road.properties.province}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono">
                    {(road.properties.len / 1000).toFixed(1)} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="border-border/60 text-muted-foreground border-t px-3 py-2 text-[10px] leading-snug">
        Source: DPWH Road Classification (national road network, expressways).
      </p>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === "" || value === null || value === undefined) return null;
  return (
    <div className="flex justify-between gap-3 text-[11px]">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground min-w-0 text-right font-medium">
        {value}
      </dd>
    </div>
  );
}

export interface NearbyRisk {
  flood: { count: number; titles: string[] } | null;
  incidents: number | null;
}

interface DetailsCardProps {
  feature: RoadFeature | ExpresswayFeature;
  kind: "road" | "expressway";
  nearby: NearbyRisk;
  radius: number;
  onClose: () => void;
  className?: string;
}

/** Selected road or expressway, with flood-prone areas and incidents within reach. */
export function DetailsCard({
  feature,
  kind,
  nearby,
  radius,
  onClose,
  className,
}: DetailsCardProps) {
  const isRoad = kind === "road";
  const road = feature.properties as RoadFeature["properties"];
  const express = feature.properties as ExpresswayFeature["properties"];
  const color = isRoad ? CLASS_META[road.cls].color : EXPRESSWAY_COLOR;
  const classLabel = isRoad
    ? `${CLASS_META[road.cls].label} road`
    : "Expressway";
  const risky = (nearby.flood?.count ?? 0) + (nearby.incidents ?? 0) > 0;

  return (
    <aside
      aria-label="Selected road"
      className={cn(
        "glass border-border/60 shadow-panel pointer-events-auto overflow-hidden rounded-xl border",
        className,
      )}
    >
      <header
        className="border-border/60 flex items-start justify-between gap-2 border-b p-3"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="min-w-0">
          <h3 className="text-foreground text-sm leading-tight font-semibold break-words">
            {feature.properties.name}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {classLabel}
            {feature.properties.route
              ? ` · Route ${feature.properties.route}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <dl className="max-h-56 space-y-1 overflow-y-auto p-3">
        <Row
          label="Length"
          value={`${(feature.properties.len / 1000).toFixed(2)} km`}
        />
        <Row label="Region" value={feature.properties.region} />
        {isRoad ? (
          <>
            <Row label="Province" value={road.province} />
            <Row
              label="DEO"
              value={road.deo.replace(/ District Engineering Office$/, "")}
            />
            <Row label="Cong. district" value={road.district} />
            <Row label="Road ID" value={road.roadId} />
            <Row label="Section ID" value={road.section} />
            <Row label="Remarks" value={road.remarks} />
          </>
        ) : (
          <>
            <Row label="Expressway" value={express.way} />
            <Row label="Status" value={express.status} />
            <Row label="Delivery" value={express.project} />
          </>
        )}
      </dl>
      <div className="border-border/60 space-y-1.5 border-t p-3">
        <h4 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
          <TriangleAlert
            className={cn(
              "size-3.5",
              risky ? "text-warning" : "text-muted-foreground",
            )}
            aria-hidden
          />
          Within {radius} m of this {isRoad ? "section" : "expressway segment"}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-muted/40 rounded-md p-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <Layers className="size-3 text-[#7c3aed]" aria-hidden />
              Flood-prone areas
            </p>
            <p className="text-foreground font-mono text-base font-semibold">
              {nearby.flood ? nearby.flood.count : "…"}
            </p>
          </div>
          <div className="bg-muted/40 rounded-md p-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 text-[#e11d48]" aria-hidden />
              NCR incidents
            </p>
            <p className="text-foreground font-mono text-base font-semibold">
              {nearby.incidents ?? "…"}
            </p>
          </div>
        </div>
        {nearby.flood && nearby.flood.titles.length > 0 ? (
          <ul className="text-muted-foreground space-y-0.5 text-[11px]">
            {nearby.flood.titles.map((t) => (
              <li key={t} className="truncate">
                • {t}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
