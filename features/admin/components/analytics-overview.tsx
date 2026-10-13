"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import {
  Activity,
  Clock3,
  Compass,
  Eye,
  FileText,
  Globe2,
  Laptop,
  MapPin,
  MonitorSmartphone,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { AdminApiError } from "@/features/admin/api";
import { AdminCard, Notice, Segmented, SkeletonBlock } from "@/features/admin/components/admin-ui";
import {
  areaLabel,
  bucketLabel,
  bucketTick,
  capitalize,
  countryFlag,
  countryName,
  formatNumber,
  hourLabel,
} from "@/features/admin/format";
import { useVisitStats } from "@/features/admin/hooks/use-admin";
import { AREA_OPTIONS, RANGE_OPTIONS, toArea, type AreaFilter } from "@/features/admin/filters";
import type { BreakdownRow, StatsRange, VisitStats } from "@/features/admin/types";
import { cn } from "@/utils/cn";

/** Validated pairs (dataviz validator): page views, visitors — per theme. */
const SERIES = {
  light: { views: "#0891b2", visitors: "#4f46e5", grid: "#e2e8f0", axis: "#5b6b82" },
  dark: { views: "#0aa2bf", visitors: "#7a7ff5", grid: "#1b283f", axis: "#94a3b8" },
};

function useSeriesColors() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "light" ? SERIES.light : SERIES.dark;
}

// ------------------------------------------------------------------ KPI tiles

function Kpi({
  label,
  value,
  hint,
  icon,
  accent,
  live,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent: string;
  live?: boolean;
}) {
  return (
    <div className="admin-kpi relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
      <span className={cn("admin-kpi__glow", accent)} aria-hidden />
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", accent)}>{icon}</span>
      </div>
      <p className="relative mt-2 flex items-center gap-2 font-display text-[1.9rem] font-bold leading-none tracking-wide text-foreground sm:text-[2.2rem]">
        {live ? <span className="admin-live-dot" aria-hidden /> : null}
        {value}
      </p>
      <p className="relative mt-1.5 truncate text-[11px] leading-4 text-muted-foreground">{hint}</p>
    </div>
  );
}

function KpiRow({ stats }: { stats: VisitStats }) {
  const perVisitor = stats.visitors ? (stats.pageViews / stats.visitors).toFixed(1) : "0";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        label="Visitors"
        value={formatNumber(stats.visitors)}
        hint={`${formatNumber(stats.sessions)} visits (sessions)`}
        icon={<Users className="size-4" aria-hidden />}
        accent="bg-primary/15 text-primary"
      />
      <Kpi
        label="Page views"
        value={formatNumber(stats.pageViews)}
        hint={`${perVisitor} pages per visitor`}
        icon={<Eye className="size-4" aria-hidden />}
        accent="bg-secondary/15 text-secondary"
      />
      <Kpi
        label="Online now"
        value={formatNumber(stats.liveVisitors)}
        hint="Active in the last 5 min"
        icon={<Activity className="size-4" aria-hidden />}
        accent="bg-success/15 text-success"
        live
      />
      <Kpi
        label="New visitors"
        value={formatNumber(stats.newVisitors)}
        hint={
          stats.visitors
            ? `${Math.round((stats.newVisitors / stats.visitors) * 100)}% first-time`
            : "First time on the site"
        }
        icon={<Sparkles className="size-4" aria-hidden />}
        accent="bg-warning/15 text-warning"
      />
    </div>
  );
}

// ------------------------------------------------------------------ charts

function SeriesTooltip({ active, payload, bucket }: TooltipProps<number, string> & { bucket: "hour" | "day" }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as VisitStats["series"][number] | undefined;
  if (!point) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-caption shadow-dropdown">
      <p className="mb-1 font-semibold text-foreground">{bucketLabel(point.t, bucket)}</p>
      {payload.map((p) => (
        <p key={p.dataKey as string} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.dataKey === "views" ? "Page views" : "Visitors"}
          <span className="ml-auto pl-3 font-semibold text-foreground">{formatNumber(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

function TrafficChart({ stats }: { stats: VisitStats }) {
  const c = useSeriesColors();
  const empty = stats.pageViews === 0;
  return (
    <AdminCard
      title={stats.bucket === "hour" ? "Traffic today, by hour" : "Traffic by day"}
      icon={<Activity className="size-4" aria-hidden />}
      action={
        <div className="flex items-center gap-3 text-[11px] leading-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm" style={{ background: c.views }} aria-hidden /> Page views
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: c.visitors }} aria-hidden /> Visitors
          </span>
        </div>
      }
    >
      <div className="relative h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={stats.series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="admin-views-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.views} stopOpacity={0.35} />
                <stop offset="100%" stopColor={c.views} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t: string) => bucketTick(t, stats.bucket)}
              tick={{ fill: c.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
            />
            <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              content={<SeriesTooltip bucket={stats.bucket} />}
              cursor={{ stroke: c.axis, strokeDasharray: "3 3", strokeOpacity: 0.6 }}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke={c.views}
              strokeWidth={2}
              fill="url(#admin-views-fill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="visitors"
              stroke={c.visitors}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {empty ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-caption text-muted-foreground">
            No visits in this period yet
          </p>
        ) : null}
      </div>
    </AdminCard>
  );
}

function HoursChart({ stats }: { stats: VisitStats }) {
  const c = useSeriesColors();
  const peak = stats.hours.reduce((best, h) => (h.views > best.views ? h : best), stats.hours[0] ?? { hour: 0, views: 0 });
  return (
    <AdminCard
      title="Busiest hours"
      icon={<Clock3 className="size-4" aria-hidden />}
      action={
        peak.views > 0 ? (
          <span className="text-[11px] leading-4 text-muted-foreground">
            Peak {hourLabel(peak.hour)} – {hourLabel((peak.hour + 1) % 24)}
          </span>
        ) : null
      }
    >
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.hours} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="hour"
              tickFormatter={(h: number) => hourLabel(h).replace(" ", "")}
              tick={{ fill: c.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: c.grid, fillOpacity: 0.5 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { hour: number; views: number } | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 text-caption shadow-dropdown">
                    <p className="font-semibold text-foreground">
                      {hourLabel(p.hour)} – {hourLabel((p.hour + 1) % 24)}
                    </p>
                    <p className="text-muted-foreground">{formatNumber(p.views)} page views</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="views" fill={c.views} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  );
}

// ------------------------------------------------------------------ breakdowns

function Breakdown({
  title,
  icon,
  rows,
  total,
  label,
  empty = "No data yet",
}: {
  title: string;
  icon: ReactNode;
  rows: BreakdownRow[];
  total: number;
  label: (row: BreakdownRow) => ReactNode;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <AdminCard title={title} icon={icon} bodyClassName="p-2">
      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-caption text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-0.5">
          <li className="flex justify-between px-2 pb-1 text-[11px] leading-4 uppercase tracking-wide text-muted-foreground">
            <span>Name</span>
            <span>Visitors</span>
          </li>
          {rows.slice(0, 8).map((row) => (
            <li key={row.label || "unknown"} className="relative overflow-hidden rounded-lg px-2 py-2">
              <span
                className="absolute inset-y-1 left-0 rounded-md bg-primary/12"
                style={{ width: `${(row.visitors / max) * 100}%` }}
                aria-hidden
              />
              <div className="relative flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-caption text-foreground">{label(row)}</span>
                <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                  {total ? `${Math.round((row.visitors / total) * 100)}%` : ""}
                </span>
                <span className="w-12 shrink-0 text-right text-caption font-semibold tabular-nums text-foreground">
                  {formatNumber(row.visitors)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

/** "Quezon City, NCR, PH" → flag + "Quezon City, NCR". */
function CityLabel({ label }: { label: string }) {
  if (!label) return <>Unknown</>;
  const parts = label.split(", ");
  const code = parts.length > 1 && /^[A-Z]{2}$/.test(parts[parts.length - 1] ?? "") ? parts.pop()! : null;
  return (
    <>
      <span className="mr-1.5" aria-hidden>
        {countryFlag(code)}
      </span>
      {parts.join(", ") || countryName(code)}
      {code && parts.length ? <span className="sr-only">, {countryName(code)}</span> : null}
    </>
  );
}

// ------------------------------------------------------------------ view

export function AnalyticsOverview({ onOpenSetup }: { onOpenSetup: () => void }) {
  const [range, setRange] = useState<StatsRange>("7d");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const query = useVisitStats(range, toArea(areaFilter), true);
  const stats = query.data;
  const updated = useMemo(
    () => (query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : null),
    [query.dataUpdatedAt],
  );

  const notReady = query.error instanceof AdminApiError && query.error.reason === "db_not_ready";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Period" value={range} options={RANGE_OPTIONS} onChange={setRange} className="sm:w-auto" />
        <Segmented
          label="Area"
          value={areaFilter}
          options={AREA_OPTIONS}
          onChange={setAreaFilter}
          className="sm:w-auto"
        />
      </div>

      {notReady ? (
        <Notice
          title="Visitor tracking is not switched on yet"
          action={
            <button
              type="button"
              onClick={onOpenSetup}
              className="h-10 rounded-lg bg-warning px-4 text-caption font-semibold text-black"
            >
              Open Setup
            </button>
          }
        >
          Create the visitor tables in Supabase once (Setup tab). Visits are counted from that moment on.
        </Notice>
      ) : query.error ? (
        <Notice tone="danger" title="Statistics could not be loaded">
          {query.error.message}
        </Notice>
      ) : null}

      {stats ? (
        <>
          <KpiRow stats={stats} />
          <TrafficChart stats={stats} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <HoursChart stats={stats} />
            </div>
            <Breakdown
              title="Website vs Command Center"
              icon={<Compass className="size-4" aria-hidden />}
              rows={stats.areas}
              total={stats.visitors}
              label={(r) => areaLabel(r.label)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Breakdown
              title="Top pages"
              icon={<FileText className="size-4" aria-hidden />}
              rows={stats.pages}
              total={stats.visitors}
              label={(r) => <span className="font-mono text-[12px]">{r.label}</span>}
            />
            <Breakdown
              title="Locations"
              icon={<MapPin className="size-4" aria-hidden />}
              rows={stats.cities}
              total={stats.visitors}
              label={(r) => <CityLabel label={r.label} />}
            />
            <Breakdown
              title="Where visitors came from"
              icon={<Globe2 className="size-4" aria-hidden />}
              rows={stats.referrers}
              total={stats.visitors}
              label={(r) => r.label || "Direct / bookmark"}
            />
            <Breakdown
              title="Devices"
              icon={<MonitorSmartphone className="size-4" aria-hidden />}
              rows={stats.devices}
              total={stats.visitors}
              label={(r) => capitalize(r.label)}
            />
            <Breakdown
              title="Browsers"
              icon={<Compass className="size-4" aria-hidden />}
              rows={stats.browsers}
              total={stats.visitors}
              label={(r) => r.label || "Unknown"}
            />
            <Breakdown
              title="Operating systems"
              icon={<Laptop className="size-4" aria-hidden />}
              rows={stats.os}
              total={stats.visitors}
              label={(r) => r.label || "Unknown"}
            />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
            <RefreshCw className={cn("size-3", query.isFetching && "animate-spin")} aria-hidden />
            Updates every minute{updated ? ` · last ${updated}` : ""} · Philippine time
          </p>
        </>
      ) : query.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-28" />
            ))}
          </div>
          <SkeletonBlock className="h-72" />
        </div>
      ) : null}
    </div>
  );
}
