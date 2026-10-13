"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Laptop,
  MapPin,
  Monitor,
  Search,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminApiError } from "@/features/admin/api";
import { AREA_OPTIONS, RANGE_OPTIONS, toArea, type AreaFilter } from "@/features/admin/filters";
import { AdminCard, Notice, Segmented, SkeletonBlock } from "@/features/admin/components/admin-ui";
import { areaLabel, countryFlag, formatDate, formatNumber, formatTime, timeAgo } from "@/features/admin/format";
import { useVisits, visitsExportUrl } from "@/features/admin/hooks/use-admin";
import type { StatsRange, VisitRecord } from "@/features/admin/types";
import { cn } from "@/utils/cn";

function DeviceIcon({ device }: { device: string | null }) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : device === "desktop" ? Monitor : Laptop;
  return <Icon className="size-4 shrink-0" aria-hidden />;
}

function place(v: VisitRecord): string {
  return [v.city, v.region].filter(Boolean).join(", ") || v.country || "Unknown location";
}

function AreaBadge({ area }: { area: VisitRecord["area"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] leading-4 font-semibold",
        area === "command" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary",
      )}
    >
      {areaLabel(area)}
    </span>
  );
}

function VisitorBadge({ v }: { v: VisitRecord }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] leading-4 text-muted-foreground">
      #{v.visitorId.slice(0, 6)}
      {v.isNewVisitor ? (
        <span className="rounded-full bg-warning/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-warning">New</span>
      ) : null}
    </span>
  );
}

/** Phone and tablet: one card per visit. */
function VisitCard({ v }: { v: VisitRecord }) {
  return (
    <li className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-foreground">{formatTime(v.occurredAt)}</p>
          <p className="text-[11px] leading-4 text-muted-foreground">
            {formatDate(v.occurredAt)} · {timeAgo(v.occurredAt)}
          </p>
        </div>
        <AreaBadge area={v.area} />
      </div>
      <p className="mt-2 truncate font-mono text-[12px] text-foreground" title={v.path}>
        {v.path}
      </p>
      {v.pageTitle ? <p className="truncate text-[11px] leading-4 text-muted-foreground">{v.pageTitle}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          <span aria-hidden>{countryFlag(v.country)}</span>
          <span className="truncate">{place(v)}</span>
        </span>
        <span className="flex items-center gap-1">
          <DeviceIcon device={v.device} />
          {[v.browser, v.os].filter(Boolean).join(" · ") || "Unknown"}
        </span>
        <span>{v.referrerHost ? `from ${v.referrerHost}` : "Direct"}</span>
        <VisitorBadge v={v} />
      </div>
    </li>
  );
}

/** Desktop: table. */
function VisitTable({ items }: { items: VisitRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-caption">
        <thead className="border-b border-border text-[11px] leading-4 uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Date & time</th>
            <th className="px-3 py-2 font-semibold">Page</th>
            <th className="px-3 py-2 font-semibold">Location</th>
            <th className="px-3 py-2 font-semibold">Device</th>
            <th className="px-3 py-2 font-semibold">Came from</th>
            <th className="px-3 py-2 font-semibold">Visitor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((v) => (
            <tr key={v.id} className="align-top hover:bg-muted/30">
              <td className="whitespace-nowrap px-3 py-2.5">
                <p className="font-semibold text-foreground">{formatTime(v.occurredAt)}</p>
                <p className="text-[11px] leading-4 text-muted-foreground">{formatDate(v.occurredAt)}</p>
              </td>
              <td className="max-w-[18rem] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <AreaBadge area={v.area} />
                </div>
                <p className="mt-1 truncate font-mono text-[12px] text-foreground" title={v.path}>
                  {v.path}
                </p>
                {v.pageTitle ? <p className="truncate text-[11px] leading-4 text-muted-foreground">{v.pageTitle}</p> : null}
              </td>
              <td className="px-3 py-2.5 text-foreground">
                <span className="mr-1" aria-hidden>
                  {countryFlag(v.country)}
                </span>
                {place(v)}
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-foreground">
                  <DeviceIcon device={v.device} />
                  {v.browser ?? "Unknown"}
                </span>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  {[v.os, v.screen].filter(Boolean).join(" · ")}
                </p>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{v.referrerHost ?? "Direct"}</td>
              <td className="px-3 py-2.5">
                <VisitorBadge v={v} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VisitorLog({ onOpenSetup }: { onOpenSetup: () => void }) {
  const [range, setRange] = useState<StatsRange>("today");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const area = toArea(areaFilter);
  const query = useVisits(range, area, q, page, true);
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const notReady = query.error instanceof AdminApiError && query.error.reason === "db_not_ready";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Segmented
          label="Period"
          value={range}
          options={RANGE_OPTIONS}
          onChange={(v) => {
            setRange(v);
            setPage(1);
          }}
          className="lg:w-auto"
        />
        <Segmented
          label="Area"
          value={areaFilter}
          options={AREA_OPTIONS}
          onChange={(v) => {
            setAreaFilter(v);
            setPage(1);
          }}
          className="lg:w-auto"
        />
        <div className="flex gap-2 lg:ml-auto">
          <div className="min-w-0 flex-1 lg:w-64">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search page, city, browser"
              aria-label="Search visits"
              leftIcon={<Search className="size-4" aria-hidden />}
            />
          </div>
          <a
            href={visitsExportUrl(range, area, q)}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-caption font-semibold text-foreground hover:bg-muted"
          >
            <Download className="size-4" aria-hidden />
            CSV
          </a>
        </div>
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
          Create the visitor tables in Supabase once (Setup tab).
        </Notice>
      ) : query.error ? (
        <Notice tone="danger" title="Visits could not be loaded">
          {query.error.message}
        </Notice>
      ) : null}

      <AdminCard
        title={data ? `${formatNumber(data.total)} page views` : "Visits"}
        icon={<MapPin className="size-4" aria-hidden />}
        action={<span className="text-[11px] leading-4 text-muted-foreground">Newest first · Philippine time</span>}
        bodyClassName="p-2 sm:p-3"
      >
        {data ? (
          data.items.length === 0 ? (
            <p className="py-10 text-center text-caption text-muted-foreground">No visits match this filter.</p>
          ) : (
            <>
              <ul className="space-y-2 lg:hidden">
                {data.items.map((v) => (
                  <VisitCard key={v.id} v={v} />
                ))}
              </ul>
              <div className="hidden lg:block">
                <VisitTable items={data.items} />
              </div>
            </>
          )
        ) : query.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
        ) : null}

        {data && data.total > data.pageSize ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-caption font-semibold text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden /> Newer
            </button>
            <span className="text-caption text-muted-foreground">
              Page {page} of {formatNumber(pages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-caption font-semibold text-foreground disabled:opacity-40"
            >
              Older <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}
