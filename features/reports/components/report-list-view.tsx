"use client";

import { useMemo, useState } from "react";
import { BellRing, Inbox, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import type { ReportListItem, ReportListQuery, ReportsAccessState } from "@/features/reports/types";
import { parseAiSummary } from "@/features/reports/lib/ai-summary";
import { formatDateTime, truncate } from "@/features/reports/lib/format";
import { reportTypeLabel } from "@/features/reports/lib/labels";
import { useNewReportsCount, useReportList } from "@/features/reports/hooks/use-reports";
import { CreateIncidentModal } from "@/features/reports/components/create-incident-modal";
import { ReportCard } from "@/features/reports/components/report-card";
import { ReportDetailView } from "@/features/reports/components/report-detail";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { PlatformBadge, StatusBadge } from "@/features/reports/components/report-ui";

const DEFAULTS: Record<"incoming" | "archive", ReportListQuery> = {
  incoming: { datePreset: "7d", status: "all", page: 1, pageSize: 25 },
  archive: { datePreset: "all", status: "all", page: 1, pageSize: 50 },
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
    <Card className="overflow-hidden">
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
  );
}

export function ReportListView({ variant, access }: { variant: "incoming" | "archive"; access: ReportsAccessState }) {
  const [query, setQuery] = useState<ReportListQuery>(DEFAULTS[variant]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [incidentFor, setIncidentFor] = useState<string | null>(null);
  const list = useReportList(query);
  const [since, setSince] = useState<string | null>(null);

  // Reference time for the "new reports" notice = when the current list was loaded.
  const loadedAt = list.dataUpdatedAt ? new Date(list.dataUpdatedAt).toISOString() : null;
  if (variant === "incoming" && loadedAt && !since) setSince(loadedAt);
  const updates = useNewReportsCount(since, variant === "incoming");
  const newCount = updates.data?.count ?? 0;

  const result = list.data?.data;
  const filtered = hasFilters(query, variant);
  const pageSizes = useMemo(() => [25, 50, 100], []);

  const showNew = () => {
    setSince(new Date().toISOString());
    setQuery((q) => ({ ...q, page: 1 }));
    void list.refetch();
  };

  return (
    <div className="space-y-4">
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <span>
          {result ? (
            <>
              <span className="font-semibold text-foreground">{result.total.toLocaleString()}</span> report{result.total === 1 ? "" : "s"}
              {query.status === "all" ? " (excluding messages classified as not flood reports)" : ""}
            </>
          ) : (
            " "
          )}
        </span>
        <span className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            Per page
            <select
              value={query.pageSize}
              onChange={(e) => setQuery((q) => ({ ...q, pageSize: Number(e.target.value), page: 1 }))}
              className="h-8 rounded-md border border-border bg-card px-2 text-caption text-foreground"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => list.refetch()}
            leftIcon={<RefreshCw className={cn("size-3.5", list.isFetching && "animate-spin")} aria-hidden />}
          >
            Refresh
          </Button>
        </span>
      </div>

      {list.isPending ? (
        <ListSkeleton rows={variant === "incoming" ? 3 : 1} />
      ) : list.isError ? (
        <Card>
          <ErrorState title="Unable to retrieve reports" description={list.error.message} onRetry={() => list.refetch()} />
        </Card>
      ) : !result || result.items.length === 0 ? (
        <Card>
          {filtered ? (
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
        <div className={cn("space-y-3 transition-opacity", list.isPlaceholderData && "opacity-60")}>
          {variant === "incoming" ? (
            result.items.map((item) => (
              <ReportCard
                key={item.id}
                item={item}
                reviewEnabled={access.reviewEnabled}
                incidentsEnabled={result.incidentStorage === "ready"}
                onOpen={setSelectedId}
                onCreateIncident={setIncidentFor}
                highlighted={item.id === selectedId}
              />
            ))
          ) : (
            <ArchiveTable items={result.items} onOpen={setSelectedId} />
          )}
          {result.incidentStorage === "not_configured" ? (
            <p className="text-[11px] text-muted-foreground">
              Incident storage is not set up, so “Create Incident” is disabled. Apply{" "}
              <code>supabase/migrations/20261005000000_okb_command_incidents.sql</code> to the OKB Bridge Supabase project.
            </p>
          ) : null}
          {result.totalPages > 1 ? (
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              pageSize={result.pageSize}
              totalItems={result.total}
              onPageChange={(page) => {
                setQuery((q) => ({ ...q, page }));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : null}
        </div>
      )}

      <Drawer open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title="Report details" className="max-w-[56rem]">
        {selectedId ? <ReportDetailView id={selectedId} variant="drawer" onCreateIncident={setIncidentFor} /> : null}
      </Drawer>
      <CreateIncidentModal reportId={incidentFor} onClose={() => setIncidentFor(null)} />
    </div>
  );
}
