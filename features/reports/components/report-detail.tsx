"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  GitCompareArrows,
  History,
  ListTree,
  MapPinned,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Siren,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import type { ExtractedField, ExtractedLocation, ReportDetail, ReviewAction } from "@/features/reports/types";
import { formatClock, formatDateTime, formatFull, formatMeters } from "@/features/reports/lib/format";
import {
  INCIDENT_STATUS_META,
  platformLabel,
  reportTypeLabel,
  SEVERITY_META,
  statusMeta,
} from "@/features/reports/lib/labels";
import { useReportDetail, useReviewReport } from "@/features/reports/hooks/use-reports";
import {
  AiPanel,
  AiTag,
  ConditionBadge,
  InfoRow,
  OpsSection,
  PlatformBadge,
  StatusBadge,
} from "@/features/reports/components/report-ui";
import { LocationHistoryDrawer, SeriesChangePanel } from "@/features/reports/components/situation-change";

// ---------------------------------------------------------------------------
// Extracted field rendering — never shows raw JSON, never guesses.
// ---------------------------------------------------------------------------

type Kind = "text" | "height" | "time" | "date" | "coord" | "list";

function FieldValue({ field, kind = "text" }: { field: ExtractedField<unknown> | undefined; kind?: Kind }): ReactNode {
  if (!field || field.status === "missing") return null;
  if (field.status === "not_applicable") return <span className="text-muted-foreground">Not applicable{field.raw ? ` (“${field.raw}”)` : ""}</span>;
  if (field.status === "ambiguous") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-warning">Unclear in source:</span>
        <span>“{field.raw}”</span>
        <span className="text-[11px] text-muted-foreground">(kept as written, not interpreted)</span>
      </span>
    );
  }
  const v = field.value;
  let shown: string;
  if (kind === "height" && typeof v === "number") shown = `${field.approximate ? "approx. " : ""}${formatMeters(v)}`;
  else if (kind === "time" && typeof v === "string") shown = `${formatClock(v) ?? v}${field.date ? ` (${field.date})` : ""}`;
  else if (kind === "list" && Array.isArray(v)) shown = v.map((x) => String(x).replaceAll("_", " ")).join(", ");
  else shown = String(v ?? field.raw ?? "");
  const showRaw = field.raw && field.raw !== shown && kind !== "text";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{shown}</span>
      {showRaw ? <span className="text-[11px] text-muted-foreground">source: “{field.raw}”</span> : null}
      {field.origin === "system_derived" ? <Badge variant="outline" className="text-[10px]">system-derived</Badge> : null}
    </span>
  );
}

function FieldRow({ label, field, kind }: { label: string; field: ExtractedField<unknown> | undefined; kind?: Kind }) {
  return <InfoRow label={label} value={<FieldValue field={field} kind={kind} />} />;
}

/** Hides rows the report does not state when `onlyStated` is on. */
function stated(field: ExtractedField<unknown> | undefined): boolean {
  return Boolean(field && field.status !== "missing");
}

function LocationFields({ loc }: { loc: ExtractedLocation }) {
  const rows: [string, ExtractedField<unknown>, Kind?][] = [
    ["Location (as written)", loc.rawLocationText],
    ["Road name", loc.roadName],
    ["Kilometer reference", loc.kilometerReference],
    ["Landmark", loc.landmark],
    ["Barangay", loc.barangay],
    ["Municipality / City", loc.municipality],
    ["Province", loc.province],
    ["Latitude", loc.latitude, "coord"],
    ["Longitude", loc.longitude, "coord"],
    ["Current water level", loc.flood.currentFloodHeight, "height"],
    ["Water level before", loc.flood.floodHeightBefore, "height"],
    ["Water level after", loc.flood.floodHeightAfter, "height"],
    ["Maximum water level", loc.flood.maximumFloodHeight, "height"],
    ["Maximum level time", loc.flood.maximumFloodHeightTime, "time"],
    ["Flood started", loc.flood.floodStartedAt, "time"],
    ["Flood subsided", loc.flood.floodSubsidedAt, "time"],
    ["Road condition", loc.roadStatus],
    ["Rainfall intensity", loc.rainfall.rainfallIntensity],
    ["Rainfall started", loc.rainfall.rainfallStartedAt, "time"],
    ["Rainfall ended", loc.rainfall.rainfallEndedAt, "time"],
    ["Personnel / action taken", loc.intervention.interventionText],
    ["Action type", loc.intervention.interventionType, "list"],
    ["Remarks", loc.remarks],
  ];
  const shown = rows.filter(([, f]) => stated(f));
  const hidden = rows.length - shown.length;
  return (
    <dl className="divide-y divide-border/60">
      {shown.map(([label, f, kind]) => (
        <FieldRow key={label} label={label} field={f} kind={kind} />
      ))}
      <p className="pt-2 text-[11px] text-muted-foreground">
        {hidden} other field{hidden === 1 ? "" : "s"} not reported for this location.
      </p>
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Review actions
// ---------------------------------------------------------------------------

function ReviewBar({ report }: { report: ReportDetail }) {
  const review = useReviewReport(report.id);
  const [pending, setPending] = useState<ReviewAction | null>(null);
  const [notes, setNotes] = useState("");
  const a = report.actions;

  const run = (action: ReviewAction) => {
    review.mutate({ action, notes: notes.trim() || null }, { onSuccess: () => { setPending(null); setNotes(""); } });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => run("approve")}
          disabled={!a.canMarkReviewed}
          isLoading={review.isPending && review.variables?.action === "approve"}
          leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
          title={a.canMarkReviewed ? "Record your review in the OKB Bridge" : a.reviewUnavailableReason ?? "Only AI-processed reports awaiting review can be marked reviewed"}
        >
          Mark Reviewed
        </Button>
        {a.canReopen ? (
          <Button size="sm" variant="outline" onClick={() => setPending("reopen")} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
            Reopen
          </Button>
        ) : null}
        {a.canReject ? (
          <Button size="sm" variant="ghost" onClick={() => setPending("reject")} leftIcon={<XCircle className="size-4" aria-hidden />}>
            Reject
          </Button>
        ) : null}
      </div>
      {pending ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-caption font-semibold text-foreground">
            {pending === "reject" ? "Reject this report?" : "Reopen this report for review?"} Add a note for the audit trail (optional).
          </p>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          <div className="flex gap-2">
            <Button size="sm" variant={pending === "reject" ? "danger" : "primary"} onClick={() => run(pending)} isLoading={review.isPending}>
              Confirm {pending}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {review.isError ? <p className="text-caption text-danger">{review.error.message}</p> : null}
      {a.reviewUnavailableReason ? <p className="text-[11px] text-muted-foreground">{a.reviewUnavailableReason}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

const LOG_LABELS: Record<string, string> = {
  received: "Received by OKB Bridge",
  processing_started: "AI processing started",
  classification_completed: "AI classification completed",
  extraction_completed: "AI extraction completed",
  validation_completed: "Validation completed",
  report_saved: "Report saved",
  needs_review: "Flagged for review",
  ai_failed: "AI processing failed",
  ai_not_configured: "AI not configured",
  failed: "Processing failed",
  retry_requested: "Retry requested",
  reviewed: "Operator review",
  recovered_after_restart: "Recovered after backend restart",
};

function copy(text: string) {
  void navigator.clipboard?.writeText(text);
}

export function ReportDetailView({
  id,
  variant = "page",
  onCreateIncident,
}: {
  id: string;
  variant?: "page" | "drawer";
  onCreateIncident?: (id: string) => void;
}) {
  const detail = useReportDetail(id);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [openLoc, setOpenLoc] = useState<number | null>(null);

  if (detail.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <SkeletonText lines={8} />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <Card>
        <ErrorState
          title={detail.error.message.includes("not found") ? "Report not found" : "Unable to retrieve report"}
          description={detail.error.message}
          onRetry={() => detail.refetch()}
        />
      </Card>
    );
  }

  const r = detail.data.data;
  const s = r.source;
  const ex = r.extraction;
  const meta = r.extractionMeta;
  const status = statusMeta(r.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={r.source.platform} />
          <StatusBadge status={r.status} />
          {r.incidents.length ? (
            <Badge variant="success" dot className="uppercase tracking-wide">
              Confirmed incident
            </Badge>
          ) : null}
          <span className="font-mono text-caption text-muted-foreground">{r.reference}</span>
        </div>
        <h2 className="text-heading text-foreground">
          {ex?.reportTitle.status === "provided" ? ex.reportTitle.value : reportTypeLabel(r.reportType)}
        </h2>
        <p className="text-caption text-muted-foreground">{status.hint}</p>
        <div className="flex flex-wrap items-start gap-2">
          <ReviewBar report={r} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateIncident?.(r.id)}
            disabled={!r.actions.canCreateIncident || !onCreateIncident}
            leftIcon={<Siren className="size-4" aria-hidden />}
            title={r.incidentStorage === "not_configured" ? "Incident storage is not set up" : "Operator decision — never automatic"}
          >
            Create Incident
          </Button>
          {variant === "drawer" ? (
            <Link
              href={`${ROUTES.reports}/${r.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-caption font-medium text-primary hover:bg-muted/50"
            >
              <ExternalLink className="size-4" aria-hidden />
              Open full page
            </Link>
          ) : null}
        </div>
      </div>

      <div className={cn("grid gap-4", variant === "page" && "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
        <div className="min-w-0 space-y-4">
          {/* Traceability */}
          <OpsSection title="Report information · source traceability" icon={ShieldCheck}>
            <dl className="divide-y divide-border/60">
              <InfoRow label="Source" value={platformLabel(s.platform)} />
              <InfoRow label="Group" value={s.groupName} />
              <InfoRow label="Sender" value={s.senderName} />
              {s.senderId ? <InfoRow label="Sender identifier" value={s.senderId} mono /> : null}
              <InfoRow label="Message time" value={s.messageTimestamp ? formatDateTime(s.messageTimestamp) : null} hint={formatFull(s.messageTimestamp)} />
              <InfoRow label="Received by bridge" value={formatDateTime(s.receivedAt ?? r.createdAt)} hint={formatFull(s.receivedAt ?? r.createdAt)} />
              <InfoRow label="Report ID" value={<span>{r.reference} <span className="text-muted-foreground">· {r.id}</span></span>} mono />
              <InfoRow label="Source message ID" value={s.clientMessageId ?? r.messageId} mono />
              <InfoRow
                label="Report type"
                value={
                  r.reportType ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {reportTypeLabel(r.reportType)}
                      <AiTag label={`AI · ${r.classification?.confidence ?? "?"} confidence`} />
                    </span>
                  ) : null
                }
              />
              <InfoRow label="Status" value={status.label} />
              {s.mediaIndicator?.mediaType && s.mediaIndicator.mediaType !== "TEXT" ? (
                <InfoRow label="Attachment" value={`${s.mediaIndicator.mediaType.toLowerCase()} (${s.mediaIndicator.mediaStatus ?? "status unknown"})`} />
              ) : null}
            </dl>
          </OpsSection>

          {/* AI summary — separate from source */}
          {r.aiSummary ? (
            <AiPanel title="AI Summary" footer={meta?.extractedAt ? <span>· {formatDateTime(meta.extractedAt)}</span> : null}>
              <div className="whitespace-pre-line">{r.aiSummary}</div>
            </AiPanel>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-3 text-caption text-muted-foreground">
              {r.status === "processing"
                ? "AI analysis is in progress."
                : r.status === "received"
                  ? "Waiting for AI processing. The original message is shown below."
                  : r.status === "failed"
                    ? `AI summary is not available for this report (processing failed${r.processing.lastError ? `: ${r.processing.lastError.code}` : ""}).`
                    : "AI summary is not available for this report."}
            </div>
          )}

          {/* Original message */}
          <OpsSection
            title="Source report · original message"
            icon={FileText}
            actions={
              s.messageText ? (
                <button
                  type="button"
                  onClick={() => copy(s.messageText ?? "")}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ClipboardCopy className="size-3.5" aria-hidden />
                  Copy
                </button>
              ) : null
            }
          >
            {s.messageText ? (
              <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 font-mono text-[13px] leading-relaxed text-foreground">
                {s.messageText}
              </pre>
            ) : (
              <p className="text-caption text-muted-foreground">The message has no text (media-only message).</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Preserved exactly as received from {platformLabel(s.platform)} · {s.groupName ?? "unnamed group"} · {s.senderName ?? "unknown sender"}.
              AI processing never modifies it.
            </p>
          </OpsSection>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Monitored locations */}
          {r.observations.length ? (
            <OpsSection title={`Flood monitoring status · ${r.observations.length} location${r.observations.length === 1 ? "" : "s"}`} icon={MapPinned} bodyClassName="p-0">
              {/* Narrow containers: one stacked row per location so no column is pushed off-screen. */}
              <div className="@container">
                <ul className="divide-y divide-border/60 text-caption @xl:hidden">
                  {r.observations.map((o) => (
                    <li key={o.index} className="space-y-1.5 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-semibold text-foreground">{o.label}</p>
                        <ConditionBadge condition={o.condition} />
                      </div>
                      {o.intervention ? <p className="text-muted-foreground">{o.intervention}</p> : null}
                      <p className="text-foreground">
                        <span className="text-muted-foreground">Water level: </span>
                        <span className="font-mono">
                          {o.heightM !== null ? formatMeters(o.heightM) : o.heightRaw ? `“${o.heightRaw}”` : "—"}
                        </span>
                        <span className="text-muted-foreground"> · Road: </span>
                        {o.roadStatus ?? "—"}
                      </p>
                      {o.subsidedAt ? <p className="text-success">Subsided {formatClock(o.subsidedAt)}</p> : null}
                      {o.key ? (
                        <button
                          type="button"
                          onClick={() => setHistoryKey(o.key)}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          <History className="size-3.5" aria-hidden />
                          History
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto @xl:block">
                  <table className="w-full min-w-[560px] text-left text-caption">
                    <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Location</th>
                        <th className="px-2 py-2 font-semibold">Status</th>
                        <th className="px-2 py-2 font-semibold">Water level</th>
                        <th className="px-2 py-2 font-semibold">Road</th>
                        <th className="px-4 py-2 font-semibold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {r.observations.map((o) => (
                        <tr key={o.index} className="align-top">
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-foreground">{o.label}</p>
                            {o.intervention ? <p className="text-muted-foreground">{o.intervention}</p> : null}
                          </td>
                          <td className="px-2 py-2.5">
                            <ConditionBadge condition={o.condition} />
                            {o.subsidedAt ? <p className="mt-1 text-success">Subsided {formatClock(o.subsidedAt)}</p> : null}
                          </td>
                          <td className="px-2 py-2.5 font-mono text-foreground" title={o.conditionBasis ?? undefined}>
                            {o.heightM !== null ? formatMeters(o.heightM) : o.heightRaw ? `“${o.heightRaw}”` : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-2 py-2.5 text-foreground">{o.roadStatus ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-2.5 text-right">
                            {o.key ? (
                              <button
                                type="button"
                                onClick={() => setHistoryKey(o.key)}
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                <History className="size-3.5" aria-hidden />
                                History
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                Status is derived from the AI-extracted values and quoted source wording (hover a water level for the basis).
                “No flooding” is shown as a status, never as a 0.00 m measurement.
                {r.weather ? ` Weather: ${r.weather.text} (${r.weather.origin === "source_text" ? "as written in report" : "extracted rainfall"}).` : ""}
              </p>
            </OpsSection>
          ) : null}

          {/* Situation change */}
          {r.series ? (
            <OpsSection title="Situation change vs previous report" icon={GitCompareArrows}>
              <SeriesChangePanel comparison={r.series} onLocationHistory={setHistoryKey} compact={variant === "drawer"} />
            </OpsSection>
          ) : r.seriesNote ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-3 text-caption text-muted-foreground">
              <span className="font-semibold text-foreground">Monitoring series: </span>
              {r.seriesNote}
            </div>
          ) : null}

          {/* AI extracted information */}
          <OpsSection title="AI extracted information" icon={ListTree} actions={<AiTag label="AI-extracted" />}>
            {ex ? (
              <div className="space-y-4">
                <dl className="divide-y divide-border/60">
                  <FieldRow label="Report title" field={ex.reportTitle} />
                  <FieldRow label="Date" field={ex.reporting.reportDate} kind="date" />
                  <FieldRow label="Time" field={ex.reporting.reportTime} kind="time" />
                  {stated(ex.reporting.inspectionDate) ? <FieldRow label="Inspection date" field={ex.reporting.inspectionDate} kind="date" /> : null}
                  {stated(ex.reporting.inspectionTime) ? <FieldRow label="Inspection time" field={ex.reporting.inspectionTime} kind="time" /> : null}
                  <FieldRow label="Office / DEO" field={ex.administrative.districtEngineeringOffice} />
                  <FieldRow label="Region" field={ex.administrative.region} />
                  <FieldRow label="Province" field={ex.administrative.province} />
                  <FieldRow label="Municipality / City" field={ex.administrative.municipality} />
                  <FieldRow label="Barangay" field={ex.administrative.barangay} />
                  <InfoRow label="Weather condition" value={r.weather ? `${r.weather.text}${r.weather.origin === "source_text" ? "" : " (from extracted rainfall)"}` : null} />
                  {stated(ex.preparedBy.name) ? <FieldRow label="Prepared by" field={ex.preparedBy.name} /> : null}
                  {stated(ex.preparedBy.position) ? <FieldRow label="Position" field={ex.preparedBy.position} /> : null}
                  {stated(ex.remarks) ? <FieldRow label="Other information" field={ex.remarks} /> : null}
                </dl>

                {ex.locations.length ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Per-location details</p>
                    {ex.locations.map((loc, i) => {
                      const open = openLoc === i;
                      return (
                        <div key={i} className="rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => setOpenLoc(open ? null : i)}
                            aria-expanded={open}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-body font-medium text-foreground hover:bg-muted/40"
                          >
                            <span>
                              {i + 1}. {r.observations[i]?.label ?? `Location ${i + 1}`}
                            </span>
                            <span className="text-caption text-primary">{open ? "Hide" : "Show"} fields</span>
                          </button>
                          {open ? (
                            <div className="border-t border-border px-3 py-2">
                              <LocationFields loc={loc} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {meta?.warnings.length ? (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold text-warning">
                      <AlertTriangle className="size-4" aria-hidden />
                      Flags for the reviewer
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-caption text-foreground">
                      {meta.warnings.slice(0, 20).map((w, i) => (
                        <li key={i}>{w.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Values are only shown when the original message states them; otherwise “Not reported”. Severity, casualties,
                  evacuation and equipment are not part of the OKB Bridge extraction schema and are therefore not inferred.
                </p>
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">
                {r.status === "ignored"
                  ? "Classified as not a flood report, so no fields were extracted."
                  : r.status === "processing"
                    ? "AI analysis is in progress."
                    : "No AI-extracted data is available for this report yet."}
              </p>
            )}
          </OpsSection>

          {/* Incidents */}
          <OpsSection title="Linked incidents" icon={Siren}>
            {r.incidentStorage === "not_configured" ? (
              <p className="text-caption text-muted-foreground">Incident storage is not set up yet.</p>
            ) : r.incidents.length ? (
              <ul className="space-y-2">
                {r.incidents.map((inc) => (
                  <li key={inc.id} className="flex flex-wrap items-center gap-2 text-body">
                    <Link href={`${ROUTES.incidents}?incident=${inc.id}`} className="font-mono font-semibold text-primary hover:underline">
                      {inc.code}
                    </Link>
                    <span className="text-foreground">{inc.title}</span>
                    <Badge variant={SEVERITY_META[inc.severity].variant}>{SEVERITY_META[inc.severity].label}</Badge>
                    <Badge variant={INCIDENT_STATUS_META[inc.status].variant}>{INCIDENT_STATUS_META[inc.status].label}</Badge>
                    <Link href={`${ROUTES.incidents}?incident=${inc.id}`} className="text-caption text-primary hover:underline">
                      View Created Incident
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-muted-foreground">No incident has been created from this report.</p>
            )}
          </OpsSection>

          {/* Audit trail */}
          <OpsSection title="Review & audit trail" icon={ScrollText}>
            <ol className="space-y-2 text-caption">
              {r.processingLog.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-36 shrink-0 font-mono text-muted-foreground">{formatDateTime(e.at)}</span>
                  <span className="text-foreground">{LOG_LABELS[e.event] ?? e.event.replaceAll("_", " ")}</span>
                </li>
              ))}
              {r.reviewHistory.map((h, i) => (
                <li key={`rv-${i}`} className="flex gap-3">
                  <span className="w-36 shrink-0 font-mono text-muted-foreground">{formatDateTime(h.at)}</span>
                  <span className="text-foreground">
                    <span className="font-semibold capitalize">{h.action}</span> by {h.reviewer ?? "unknown reviewer"}
                    {h.notes ? <span className="text-muted-foreground"> — “{h.notes}”</span> : null}
                  </span>
                </li>
              ))}
              {!r.processingLog.length && !r.reviewHistory.length ? (
                <li className="text-muted-foreground">No processing or review events recorded.</li>
              ) : null}
            </ol>
            {meta ? (
              <p className="mt-3 text-[11px] text-muted-foreground">
                AI: {meta.model ?? "unknown model"} · prompt {meta.promptVersion ?? "?"} · schema v{meta.schemaVersion ?? "?"} · {r.processing.attempts}{" "}
                attempt{r.processing.attempts === 1 ? "" : "s"}
                {meta.missingFields.length ? ` · ${meta.missingFields.length} fields not reported` : ""}
              </p>
            ) : null}
          </OpsSection>
        </div>
      </div>

      <LocationHistoryDrawer reportId={r.id} locationKey={historyKey} onClose={() => setHistoryKey(null)} />
    </div>
  );
}
