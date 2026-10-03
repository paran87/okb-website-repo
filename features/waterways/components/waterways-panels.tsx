"use client";

import { useMemo, useState } from "react";
import {
  Crosshair,
  Droplets,
  Layers,
  MapPin,
  Search,
  Waves,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { OverlayState } from "@/features/waterways/components/waterways-map";
import {
  DISCHARGE_CLASSES,
  OVERLAYS,
  URBS,
  type DischargeClassId,
  type IdentifiedSegment,
  type OverlayId,
  type RiverResult,
  type UrbCode,
  type WaterwayStats,
} from "@/features/waterways/config";
import type { LegendEntries } from "@/features/waterways/lib/api";

const km = (v: number) =>
  v >= 100
    ? Math.round(v).toLocaleString()
    : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
const num = (v: number) => v.toLocaleString();
const panel =
  "glass pointer-events-auto rounded-xl border border-border/60 shadow-panel";

function Check({
  checked,
  onChange,
  label,
  swatch,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  swatch: string;
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
        style={{ backgroundColor: swatch }}
        aria-hidden
      />
      <span className="text-foreground min-w-0 flex-1 truncate">{label}</span>
      {hint ? (
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-1.5 pb-1 text-[10px] font-semibold tracking-wide uppercase">
      {children}
    </p>
  );
}

interface FiltersPanelProps {
  stats: WaterwayStats | undefined;
  urbs: UrbCode[];
  classes: DischargeClassId[];
  overlays: Record<OverlayId, OverlayState>;
  legend: LegendEntries | undefined;
  showFlood: boolean;
  showIncidents: boolean;
  floodCount: number | null;
  filtering: boolean;
  onToggleUrb: (code: UrbCode) => void;
  onZoomUrb: (code: UrbCode) => void;
  onToggleClass: (id: DischargeClassId) => void;
  onOverlay: (id: OverlayId, next: Partial<OverlayState>) => void;
  onToggleFlood: () => void;
  onToggleIncidents: () => void;
  onReset: () => void;
  onPickRiver: (name: string) => void;
  className?: string;
}

/** River search, basin and flow filters, reference layers and flood context. */
export function FiltersPanel(p: FiltersPanelProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !p.stats) return [];
    return p.stats.rivers
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, p.stats]);

  return (
    <section
      aria-label="Waterway filters"
      className={cn(
        panel,
        "flex min-h-0 flex-col overflow-y-auto",
        p.className,
      )}
    >
      <div className="relative space-y-1 p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a named river…"
            aria-label="Search rivers"
            className="border-border bg-background focus:ring-ring h-8 w-full rounded-md border pr-2 pl-8 text-xs outline-none focus:ring-2"
          />
        </div>
        {results.length > 0 ? (
          <ul className="border-border/60 bg-background max-h-48 overflow-y-auto rounded-md border">
            {results.map((r) => (
              <li key={`${r.code}-${r.name}`}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    p.onPickRiver(r.name);
                  }}
                  className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs"
                >
                  <span className="text-foreground min-w-0 truncate">
                    {r.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                    {km(r.km)} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() && p.stats ? (
          <p className="text-muted-foreground px-1 text-[11px]">
            No named river matches “{query.trim()}”.
          </p>
        ) : null}
      </div>

      <div className="border-border/60 space-y-0.5 border-t p-2">
        <Heading>Upper river basins</Heading>
        {URBS.map((u) => {
          const row = p.stats?.byUrb.find((b) => b.code === u.code);
          return (
            <div key={u.code} className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <Check
                  checked={p.urbs.includes(u.code)}
                  onChange={() => p.onToggleUrb(u.code)}
                  label={u.name.replace(" River Basin", "")}
                  swatch="#0284c7"
                  hint={row ? `${km(row.km)} km` : undefined}
                />
              </div>
              <button
                type="button"
                onClick={() => p.onZoomUrb(u.code)}
                aria-label={`Zoom to ${u.name}`}
                title={`Zoom to ${u.name}`}
                className="text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-md p-1"
              >
                <Crosshair className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-border/60 space-y-0.5 border-t p-2">
        <Heading>Flow (discharge rate)</Heading>
        {DISCHARGE_CLASSES.map((c) => {
          const row = p.stats?.byClass.find((b) => b.id === c.id);
          return (
            <Check
              key={c.id}
              checked={p.classes.includes(c.id)}
              onChange={() => p.onToggleClass(c.id)}
              label={`${c.label} · ${c.hint}`}
              swatch={c.hex}
              hint={row ? `${km(row.km)} km` : undefined}
            />
          );
        })}
        {p.filtering ? (
          <button
            type="button"
            onClick={p.onReset}
            className="text-primary mt-1 ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
          >
            <X className="size-3" aria-hidden /> Reset filters
          </button>
        ) : null}
      </div>

      <div className="border-border/60 space-y-0.5 border-t p-2">
        <Heading>Reference layers (DENR)</Heading>
        {OVERLAYS.map((o) => {
          const state = p.overlays[o.id];
          const entries = p.legend?.[o.layer];
          return (
            <div key={o.id}>
              <Check
                checked={state.on}
                onChange={() => p.onOverlay(o.id, { on: !state.on })}
                label={o.label}
                swatch="#64748b"
              />
              {state.on ? (
                <div className="space-y-1 pr-2 pb-1 pl-8">
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={state.opacity}
                    onChange={(e) =>
                      p.onOverlay(o.id, { opacity: Number(e.target.value) })
                    }
                    aria-label={`${o.label} opacity`}
                    className="accent-primary h-1 w-full"
                  />
                  {entries ? (
                    <ul className="space-y-0.5">
                      {entries.map((entry) => (
                        <li
                          key={entry.label}
                          className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={entry.image} alt="" className="size-3.5" />
                          {entry.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-border/60 space-y-0.5 border-t p-2">
        <Heading>Flood context</Heading>
        <Check
          checked={p.showFlood}
          onChange={p.onToggleFlood}
          label="Flood-prone areas (mapped)"
          swatch="#7c3aed"
          hint={p.floodCount === null ? "…" : num(p.floodCount)}
        />
        <Check
          checked={p.showIncidents}
          onChange={p.onToggleIncidents}
          label="Active incidents (NCR)"
          swatch="#e11d48"
        />
      </div>
    </section>
  );
}

interface InsightsPanelProps {
  stats: WaterwayStats | undefined;
  loading: boolean;
  failed: boolean;
  onPickUrb: (code: UrbCode) => void;
  onPickRiver: (name: string) => void;
  className?: string;
}

/** Network totals, flow mix, per-basin lengths and the longest named rivers. */
export function InsightsPanel({
  stats,
  loading,
  failed,
  onPickUrb,
  onPickRiver,
  className,
}: InsightsPanelProps) {
  if (!stats) {
    return (
      <aside
        aria-label="Waterway insights"
        className={cn(panel, "text-muted-foreground p-3 text-xs", className)}
      >
        {failed
          ? "River statistics are unavailable right now."
          : loading
            ? "Loading river statistics…"
            : null}
      </aside>
    );
  }
  const maxUrb = Math.max(...stats.byUrb.map((b) => b.km), 1);
  const totalKm = Math.max(stats.totals.km, 1);
  return (
    <aside
      aria-label="Waterway insights"
      className={cn(panel, "flex min-h-0 flex-col overflow-hidden", className)}
    >
      <div className="divide-border/60 min-h-0 flex-1 divide-y overflow-y-auto">
        <section className="space-y-2 p-3">
          <div>
            <p className="text-foreground font-mono text-xl leading-none font-semibold">
              {km(stats.totals.km)} km
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              {num(stats.totals.segments)} river segments ·{" "}
              {stats.rivers.length} named rivers
            </p>
          </div>
          <div
            className="bg-muted flex h-2 overflow-hidden rounded-full"
            aria-hidden
          >
            {DISCHARGE_CLASSES.map((c) => (
              <span
                key={c.id}
                style={{
                  width: `${((stats.byClass.find((b) => b.id === c.id)?.km ?? 0) / totalKm) * 100}%`,
                  backgroundColor: c.hex,
                }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            {DISCHARGE_CLASSES.map((c) => {
              const row = stats.byClass.find((b) => b.id === c.id);
              return (
                <li key={c.id} className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">
                    {c.label}
                  </span>
                  <span className="text-foreground font-mono">
                    {row ? km(row.km) : "–"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-1.5 p-3">
          <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <Layers className="text-primary size-3.5" aria-hidden />
            Length by upper river basin
          </h3>
          <ul className="space-y-1.5">
            {stats.byUrb.map((b) => {
              const u = URBS.find((x) => x.code === b.code);
              return (
                <li key={b.code}>
                  <button
                    type="button"
                    onClick={() => onPickUrb(b.code)}
                    className="block w-full text-left"
                    title="Zoom to this basin"
                  >
                    <span className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
                      <span className="text-foreground min-w-0 truncate">
                        {u?.name.replace(" River Basin", "")}
                      </span>
                      <span className="text-muted-foreground shrink-0 font-mono">
                        {km(b.km)} km
                      </span>
                    </span>
                    <span className="bg-muted mt-0.5 block h-1 overflow-hidden rounded-full">
                      <span
                        className="bg-primary block h-full rounded-full"
                        style={{ width: `${(b.km / maxUrb) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground block text-[10px]">
                      {u?.places}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-1.5 p-3">
          <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <Waves className="text-primary size-3.5" aria-hidden />
            Longest named rivers
          </h3>
          <ul className="space-y-0.5">
            {stats.rivers.slice(0, 12).map((r) => (
              <li key={`${r.code}-${r.name}`}>
                <button
                  type="button"
                  onClick={() => onPickRiver(r.name)}
                  className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px]"
                >
                  <span className="text-foreground min-w-0 flex-1 truncate">
                    {r.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono">
                    {km(r.km)} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="border-border/60 text-muted-foreground border-t px-3 py-2 text-[10px] leading-snug">
        Source: DENR INREMP GDSS river system. Discharge rate as published by
        DENR.
      </p>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-[11px]">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground min-w-0 text-right font-medium">
        {value}
      </dd>
    </div>
  );
}

interface DetailsCardProps {
  segment: IdentifiedSegment | null;
  river: RiverResult | null;
  loading: boolean;
  nearbyFlood: number | null;
  nearbyIncidents: number;
  radiusKm: number;
  onSelectRiver: (name: string) => void;
  onClose: () => void;
  className?: string;
}

/** The river or segment the user picked, with nearby flood-prone areas. */
export function DetailsCard({
  segment,
  river,
  loading,
  nearbyFlood,
  nearbyIncidents,
  radiusKm,
  onSelectRiver,
  onClose,
  className,
}: DetailsCardProps) {
  const title = river ? river.name : (segment?.river ?? "Unnamed stream");
  const flowClass = (q: number | null) => {
    if (!q) return "Dry / no data";
    return q <= 5 ? "Low flow" : q <= 50 ? "Moderate flow" : "High flow";
  };
  return (
    <aside
      aria-label="Selected river"
      className={cn(panel, "overflow-hidden", className)}
    >
      <header
        className="border-border/60 flex items-start justify-between gap-2 border-b p-3"
        style={{ borderLeft: "4px solid #0284c7" }}
      >
        <div className="min-w-0">
          <h3 className="text-foreground text-sm leading-tight font-semibold break-words">
            {loading ? "Loading river…" : title}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {river ? "Named river (all segments)" : "River segment"}
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
        {river ? (
          <>
            <Row label="Basin" value={river.basins.join(", ")} />
            <Row label="Total length" value={`${km(river.km)} km`} />
            <Row label="Segments" value={num(river.segments)} />
            <Row
              label="Peak discharge"
              value={
                river.maxDischarge === null
                  ? null
                  : river.maxDischarge.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
              }
            />
          </>
        ) : segment ? (
          <>
            <Row label="Basin" value={segment.basin} />
            <Row
              label="Segment length"
              value={`${num(Math.round(segment.lengthM))} m`}
            />
            <Row
              label="Discharge rate"
              value={
                segment.discharge === null
                  ? "Not measured"
                  : segment.discharge.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
              }
            />
            <Row label="Flow class" value={flowClass(segment.discharge)} />
          </>
        ) : null}
      </dl>
      {segment?.river && !river ? (
        <div className="border-border/60 border-t p-3">
          <button
            type="button"
            onClick={() => onSelectRiver(segment.river!)}
            className="border-border/60 text-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium"
          >
            <Waves className="size-3.5" aria-hidden /> Highlight the whole river
          </button>
        </div>
      ) : null}
      <div className="border-border/60 space-y-1.5 border-t p-3">
        <h4 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
          <Droplets className="text-primary size-3.5" aria-hidden />
          Within {radiusKm} km
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-muted/40 rounded-md p-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <Layers className="size-3 text-[#7c3aed]" aria-hidden />
              Flood-prone areas
            </p>
            <p className="text-foreground font-mono text-base font-semibold">
              {nearbyFlood === null ? "…" : nearbyFlood}
            </p>
          </div>
          <div className="bg-muted/40 rounded-md p-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 text-[#e11d48]" aria-hidden />
              NCR incidents
            </p>
            <p className="text-foreground font-mono text-base font-semibold">
              {nearbyIncidents}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
