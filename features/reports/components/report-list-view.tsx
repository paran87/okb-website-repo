"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { BellRing, Inbox, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import type { ReportListItem, ReportListQuery, ReportListResult } from "@/features/reports/types";
import { parseAiSummary } from "@/features/reports/lib/ai-summary";
import { formatDateTime, truncate } from "@/features/reports/lib/format";
import { reportTypeLabel } from "@/features/reports/lib/labels";
import { reportKeys, useInfiniteReportList, useNewReportsCount } from "@/features/reports/hooks/use-reports";
import { CreateIncidentModal } from "@/features/reports/components/create-incident-modal";
import { ReportCard } from "@/features/reports/components/report-card";
import { ReportDetailView } from "@/features/reports/components/report-detail";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { PlatformBadge, StatusBadge } from "@/features/reports/components/report-ui";

const DEFAULTS: Record<"incoming" | "archive", ReportListQuery> = {
  incoming: { datePreset: "7d", status: "all", pageSize: 25 },
  archive: { datePreset: "all", status: "all", pageSize: 50 },
};

function hasFilters(q: ReportListQuery, variant: "incoming" | "archive"): boolean {
  const d = DEFAULTS[variant];
  return Boolean(
    q.q ||
      (q.platform && q.platform !== "all") ||
      (q.group && q.group !== "all") ||
      (q.status && q.status !== "all") ||
      (q.reportType && q.reportType !== "all") ||
      (q.region && q.region !== "all") ||
      (q.province && q.province !== "all") ||
      (q.municipality && q.municipality !== "all") ||
      (q.office && q.office !== "all") ||
      q.location ||
      q.datePreset !== d.datePreset,
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading reports">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-card" />
      ))}
    </div>
  );
}

function ArchiveTable({ items, onOpen }: { items: ReportListItem[]; onOpen: (id: string) => void }) {
  return (
    <div className="@container">
      {/* Narrow containers: stacked cards so no column is pushed off-screen. */}
      <ul className="space-y-2 @5xl:hidden">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onOpen(it.id)}
              className="w-full space-y-1.5 rounded-card border border-border bg-card p-2.5 text-left text-[11px] outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring sm:space-y-2 sm:p-3 sm:text-caption"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <PlatformBadge platform={it.platform} />
                <StatusBadge status={it.status} />
                {it.incidents[0] ? <span className="font-mono text-[11px] text-success">{it.incidents[0].code}</span> : null}
              </div>
              {it.title ? <p className="text-[13px] font-semibold leading-snug text-foreground sm:text-body">{it.title}</p> : null}
              <p className="line-clamp-2 text-muted-foreground sm:line-clamp-none">{truncate(it.aiSummary ? parseAiSummary(it.aiSummary).overall : it.preview, 160)}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 sm:gap-y-1">
                <dt className="text-muted-foreground">Received</dt>
                <dd className="text-foreground">
                  {formatDateTime(it.messageTime ?? it.receivedAt)} <span className="font-mono text-[11px] text-muted-foreground">{it.reference}</span>
                </dd>
                <dt className="text-muted-foreground">Group</dt>
                <dd className="break-words text-foreground">
                  {it.groupName ?? "Unnamed group"} · {it.senderName ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-foreground">
                  {reportTypeLabel(it.reportType)}
                  {[it.office, it.region].filter(Boolean).length ? ` · ${[it.office, it.region].filter(Boolean).join(" · ")}` : ""}
                </dd>
                {it.locationCount ? (
                  <>
                    <dt className="text-muted-foreground">Locations</dt>
                    <dd className="text-foreground">
                      {it.locationCount} · <span className={it.floodedCount ? "font-semibold text-warning" : ""}>{it.floodedCount} flooded</span>
                    </dd>
                  </>
                ) : null}
              </dl>
            </button>
          </li>
        ))}
      </ul>
      <Card className="hidden overflow-hidden @5xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-caption">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Received</th>
                <th className="px-3 py-2.5 font-semibold">Source / group</th>
                <th className="px-3 py-2.5 font-semibold">Sender</th>
                <th className="px-3 py-2.5 font-semibold">Type · office</th>
                <th className="px-3 py-2.5 font-semibold">Report</th>
                <th className="px-3 py-2.5 font-semibold">Locations</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => onOpen(it.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(it.id)}
                  tabIndex={0}
                  className="cursor-pointer align-top outline-none hover:bg-muted/30 focus-visible:bg-muted/40"
                >
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <p className="text-foreground">{formatDateTime(it.messageTime ?? it.receivedAt)}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{it.reference}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <PlatformBadge platform={it.platform} />
                    <p className="mt-1 max-w-[200px] truncate text-foreground">{it.groupName ?? "Unnamed group"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{it.senderName ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-foreground">{reportTypeLabel(it.reportType)}</p>
                    <p className="text-muted-foreground">{[it.office, it.region].filter(Boolean).join(" · ") || "Office not reported"}</p>
                  </td>
                  <td className="max-w-[360px] px-3 py-2.5 text-foreground">
                    {it.title ? <p className="font-semibold">{it.title}</p> : null}
                    <p className="text-muted-foreground">{truncate(it.aiSummary ? parseAiSummary(it.aiSummary).overall : it.preview, 160)}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {it.locationCount ? (
                      <span>
                        {it.locationCount} · <span className={it.floodedCount ? "font-semibold text-warning" : ""}>{it.floodedCount} flooded</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={it.status} />
                    {it.incidents[0] ? <p className="mt-1 font-mono text-[11px] text-success">{it.incidents[0].code}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ReportListView({ variant }: { variant: "incoming" | "archive" }) {
  const [query, setQuery] = useState<ReportListQuery>(DEFAULTS[variant]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [incidentFor, setIncidentFor] = useState<string | null>(null);
  // Pages are loaded by scrolling, so the filters' page number is not part of the list query.
  const listQuery = useMemo(() => {
    const { page, ...rest } = query;
    void page;
    return rest;
  }, [query]);
  const list = useInfiniteReportList(listQuery);
  const queryClient = useQueryClient();
  const [since, setSince] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Reference time for the "new reports" notice = when the current list was loaded.
  const loadedAt = list.dataUpdatedAt ? new Date(list.dataUpdatedAt).toISOString() : null;
  if (variant === "incoming" && loadedAt && !since) setSince(loadedAt);
  const updates = useNewReportsCount(since, variant === "incoming");
  const newCount = updates.data?.count ?? 0;

  const pages = list.data?.pages;
  const result = pages?.[0];
  // Reports arriving while scrolling shift later pages; drop any repeats.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (pages ?? []).flatMap((p) => p.items).filter((it) => !seen.has(it.id) && Boolean(seen.add(it.id)));
  }, [pages]);
  const filtered = hasFilters(query, variant);
  // Messages the same filters match that were classified as not a flood report (hidden under "All statuses").
  const hidden = query.status === "all" ? (result?.hiddenNotFlood ?? 0) : 0;
  const showHidden = () => setQuery((q) => ({ ...q, status: "ignored", page: 1 }));
  const hiddenText = `${hidden.toLocaleString()} message${hidden === 1 ? "" : "s"} classified as not a flood report`;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;

  // Load the next page when the end of the list comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  const showNew = () => {
    setSince(new Date().toISOString());
    // Back to the newest page only (refetching every scrolled page would be slow), then refresh it.
    queryClient.setQueryData<InfiniteData<ReportListResult, number>>(reportKeys.infiniteList(listQuery), (d) =>
      d ? { pages: d.pages.slice(0, 1), pageParams: d.pageParams.slice(0, 1) } : d,
    );
    void list.refetch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <ReportFilters
        variant={variant}
        value={query}
        onChange={(patch) => setQuery((q) => ({ ...q, ...patch }))}
        onReset={() => setQuery(DEFAULTS[variant])}
      />

      {variant === "incoming" && newCount > 0 ? (
        <button
          type="button"
          onClick={showNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-caption font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <BellRing className="size-4" aria-hidden />
          {newCount} new report{newCount === 1 ? "" : "s"} received · Show
        </button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground sm:text-caption">
        <span>
          {result ? (
            <>
              <span className="font-semibold text-foreground">{result.total.toLocaleString()}</span> report{result.total === 1 ? "" : "s"}
              {query.status !== "all" ? null : hidden > 0 ? (
                <>
                  {` · ${hiddenText} hidden `}
                  <button
                    type="button"
                    onClick={showHidden}
                    className="-my-2 inline-flex min-h-10 items-center rounded px-1 font-semibold text-primary hover:underline"
                  >
                    Show
                  </button>
                </>
              ) : (
                " (excluding messages classified as not flood reports)"
              )}
            </>
          ) : (
            " "
          )}
        </span>
      </div>

      {list.isPending ? (
        <ListSkeleton rows={variant === "incoming" ? 3 : 1} />
      ) : list.isError && !list.data ? (
        <Card>
          <ErrorState title="Unable to retrieve reports" description={list.error.message} onRetry={() => list.refetch()} />
        </Card>
      ) : !result || items.length === 0 ? (
        <Card>
          {hidden > 0 ? (
            <EmptyState
              icon={SearchX}
              title="No flood reports match your current filters."
              description={`${hiddenText} matched and ${hidden === 1 ? "is" : "are"} hidden under "All statuses".`}
              action={
                <Button variant="outline" onClick={showHidden}>
                  Show {hidden === 1 ? "it" : "them"}
                </Button>
              }
            />
          ) : filtered ? (
            <EmptyState icon={SearchX} title="No reports match your current filters." description="Adjust the search, date range or filters." />
          ) : (
            <EmptyState
              icon={Inbox}
              title={variant === "incoming" ? "No incoming reports yet." : "No reports in the archive yet."}
              description="Reports appear here as the OKB Bridge receives them from WhatsApp and Viber groups."
            />
          )}
        </Card>
      ) : (
        <div className={cn("space-y-2 transition-opacity sm:space-y-3", list.isPlaceholderData && "opacity-60")}>
          {variant === "incoming" ? (
            items.map((item) => (
              <ReportCard key={item.id} item={item} onOpen={setSelectedId} highlighted={item.id === selectedId} />
            ))
          ) : (
            <ArchiveTable items={items} onOpen={setSelectedId} />
          )}
          {result.incidentStorage === "not_configured" ? (
            <p className="text-[11px] text-muted-foreground">
              Incident storage is not set up, so “Create Incident” is disabled. Apply{" "}
              <code>supabase/migrations/20261005000000_okb_command_incidents.sql</code> to the OKB Bridge Supabase project.
            </p>
          ) : null}
          <div ref={sentinel} className="flex min-h-12 flex-col items-center justify-center gap-1 py-2 text-[11px] text-muted-foreground sm:text-caption">
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading more reports…
              </span>
            ) : hasNextPage ? (
              <Button size="sm" variant="ghost" onClick={() => void fetchNextPage()}>
                Load more
              </Button>
            ) : items.length > 10 ? (
              <span>All {items.length.toLocaleString()} reports shown.</span>
            ) : null}
            {list.isFetchNextPageError ? (
              <span className="text-danger">Could not load more reports. Scroll or tap Load more to try again.</span>
            ) : null}
          </div>
        </div>
      )}

      <Drawer open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title="Report details" className="max-w-[56rem]">
        {selectedId ? <ReportDetailView id={selectedId} variant="drawer" onCreateIncident={setIncidentFor} /> : null}
      </Drawer>
      <CreateIncidentModal reportId={incidentFor} onClose={() => setIncidentFor(null)} />
    </div>
  );
}
