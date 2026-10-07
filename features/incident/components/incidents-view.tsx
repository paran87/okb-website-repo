"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileSearch, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import type { IncidentRecord } from "@/features/reports/types";
import { formatDateTime, truncate } from "@/features/reports/lib/format";
import { INCIDENT_STATUS_META, incidentTypeLabel, platformLabel, SEVERITY_META } from "@/features/reports/lib/labels";
import { useIncident, useIncidents, useReportDetail } from "@/features/reports/hooks/use-reports";
import { InfoRow, OpsSection, PlatformBadge } from "@/features/reports/components/report-ui";
import { ReportsGate } from "@/features/reports/components/reports-gate";
import { FloodMapPanel } from "@/features/incident/components/flood-map-panel";

function SourceReport({ reportId }: { reportId: string }) {
  const detail = useReportDetail(reportId);
  if (detail.isPending) return <SkeletonText lines={5} />;
  if (detail.isError) return <p className="text-caption text-danger">{detail.error.message}</p>;
  const r = detail.data.data;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <PlatformBadge platform={r.source.platform} />
        <span className="font-mono text-caption text-muted-foreground">{r.reference}</span>
      </div>
      <dl className="divide-y divide-border/60">
        <InfoRow label="Source" value={platformLabel(r.source.platform)} />
        <InfoRow label="Group" value={r.source.groupName} />
        <InfoRow label="Sender" value={r.source.senderName} />
        <InfoRow label="Received" value={formatDateTime(r.source.messageTimestamp ?? r.createdAt)} />
      </dl>
      {r.source.messageText ? (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 font-mono text-[12px] text-foreground">
          {r.source.messageText}
        </pre>
      ) : null}
    </div>
  );
}

function IncidentDetail({ incident }: { incident: IncidentRecord }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-body font-semibold text-foreground">{incident.code}</span>
          <Badge variant={SEVERITY_META[incident.severity].variant}>{SEVERITY_META[incident.severity].label} severity</Badge>
          <Badge variant={INCIDENT_STATUS_META[incident.status].variant} dot>
            {INCIDENT_STATUS_META[incident.status].label}
          </Badge>
        </div>
        <h2 className="text-subheading text-foreground">{incident.title}</h2>
      </div>
      <dl className="divide-y divide-border/60">
        <InfoRow label="Incident type" value={incidentTypeLabel(incident.incidentType)} />
        <InfoRow label="Location" value={incident.locationText} />
        <InfoRow label="Region" value={incident.region} />
        <InfoRow label="Province" value={incident.province} />
        <InfoRow label="Municipality / City" value={incident.municipality} />
        <InfoRow label="Created by" value={incident.createdBy} />
        <InfoRow label="Created" value={formatDateTime(incident.createdAt)} />
        <InfoRow label="Operator notes" value={incident.description} />
      </dl>
      <p className="text-[11px] text-muted-foreground">Severity is the operator&apos;s assessment, not an AI output.</p>
      <OpsSection
        title="Source report"
        icon={FileSearch}
        actions={
          <Link href={`${ROUTES.reports}/${incident.reportId}`} className="text-caption font-semibold text-primary hover:underline">
            View Source Report
          </Link>
        }
      >
        <SourceReport reportId={incident.reportId} />
      </OpsSection>
    </div>
  );
}

function IncidentList() {
  const [page, setPage] = useState(1);
  const list = useIncidents(page);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = params.get("incident");
  const result = list.data?.data;
  const fromList = result?.items.find((i) => i.id === selectedId) ?? null;
  const fetched = useIncident(fromList ? null : selectedId);
  const selected = fromList ?? fetched.data ?? null;

  const open = (id: string | null) => router.replace(id ? `${pathname}?incident=${id}` : pathname, { scroll: false });

  if (list.isPending) return <Skeleton className="h-64 w-full" />;
  if (list.isError) {
    return (
      <Card>
        <ErrorState title="Unable to retrieve incidents" description={list.error.message} onRetry={() => list.refetch()} />
      </Card>
    );
  }
  if (result?.storage === "not_configured") {
    return (
      <Card>
        <EmptyState
          icon={Siren}
          title="Incident storage is not set up"
          description="Apply supabase/migrations/20261005000000_okb_command_incidents.sql to the OKB Bridge Supabase project to enable operator-confirmed incidents."
        />
      </Card>
    );
  }
  if (!result?.items.length) {
    return (
      <Card>
        <EmptyState
          icon={Siren}
          title="No confirmed incidents yet."
          description="Incidents are created by operators from reviewed reports (Reports → Incoming Reports → Create Incident). Reports never become incidents automatically."
        />
      </Card>
    );
  }

  return (
    <div className="@container space-y-3">
      {/* Narrow containers: one stacked card per incident so every field is visible. */}
      <ul className="space-y-2 @4xl:hidden">
        {result.items.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => open(i.id)}
              className="w-full space-y-2 rounded-card border border-border bg-card p-3 text-left text-caption outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">{i.code}</span>
                <Badge variant={SEVERITY_META[i.severity].variant}>{SEVERITY_META[i.severity].label}</Badge>
                <Badge variant={INCIDENT_STATUS_META[i.status].variant} dot>
                  {INCIDENT_STATUS_META[i.status].label}
                </Badge>
              </div>
              <p className="text-body font-medium text-foreground">{truncate(i.title, 120)}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-foreground">{incidentTypeLabel(i.incidentType)}</dd>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="break-words text-foreground">{i.locationText ?? "—"}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">
                  {formatDateTime(i.createdAt)} · by {i.createdBy}
                </dd>
              </dl>
            </button>
          </li>
        ))}
      </ul>

      <Card className="hidden overflow-hidden @4xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-caption">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Incident</th>
                <th className="px-3 py-2.5 font-semibold">Type</th>
                <th className="px-3 py-2.5 font-semibold">Location</th>
                <th className="px-3 py-2.5 font-semibold">Severity</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {result.items.map((i) => (
                <tr
                  key={i.id}
                  tabIndex={0}
                  onClick={() => open(i.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(i.id)}
                  className="cursor-pointer align-top outline-none hover:bg-muted/30 focus-visible:bg-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <p className="font-mono font-semibold text-foreground">{i.code}</p>
                    <p className="text-foreground">{truncate(i.title, 80)}</p>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{incidentTypeLabel(i.incidentType)}</td>
                  <td className="px-3 py-2.5 text-foreground">{i.locationText ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={SEVERITY_META[i.severity].variant}>{SEVERITY_META[i.severity].label}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={INCIDENT_STATUS_META[i.status].variant} dot>
                      {INCIDENT_STATUS_META[i.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDateTime(i.createdAt)}
                    <br />
                    by {i.createdBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {result.totalPages > 1 ? (
        <Pagination page={result.page} totalPages={result.totalPages} pageSize={result.pageSize} totalItems={result.total} onPageChange={setPage} />
      ) : null}
      <Drawer open={Boolean(selectedId)} onClose={() => open(null)} title="Incident" className="max-w-[36rem]">
        {selected ? (
          <IncidentDetail incident={selected} />
        ) : fetched.isError ? (
          <p className="text-caption text-danger">{fetched.error.message}</p>
        ) : selectedId ? (
          <SkeletonText lines={6} />
        ) : null}
      </Drawer>
    </div>
  );
}

export function IncidentsView() {
  return (
    <ReportsGate>
      {() => (
        <div className="space-y-4">
          <FloodMapPanel />
          <IncidentList />
        </div>
      )}
    </ReportsGate>
  );
}
