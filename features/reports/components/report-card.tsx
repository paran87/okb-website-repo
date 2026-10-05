"use client";

import { AlertTriangle, CheckCircle2, Eye, FilePlus2, MapPin, Siren, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { ReportListItem } from "@/features/reports/types";
import { formatDateTime, formatFull, formatRelative } from "@/features/reports/lib/format";
import { parseAiSummary } from "@/features/reports/lib/ai-summary";
import { reportTypeLabel } from "@/features/reports/lib/labels";
import { useReviewReport } from "@/features/reports/hooks/use-reports";
import { AiTag, PlatformBadge, StatusBadge } from "@/features/reports/components/report-ui";

interface ReportCardProps {
  item: ReportListItem;
  reviewEnabled: boolean;
  incidentsEnabled: boolean;
  onOpen: (id: string) => void;
  onCreateIncident: (id: string) => void;
  highlighted?: boolean;
}

export function ReportCard({ item, reviewEnabled, incidentsEnabled, onOpen, onCreateIncident, highlighted }: ReportCardProps) {
  const review = useReviewReport(item.id);
  const reviewable = item.status === "extracted" || item.status === "needs_review";
  const time = item.messageTime ?? item.receivedAt;
  const ai = item.aiSummary ? parseAiSummary(item.aiSummary) : null;

  return (
    <article
      className={cn(
        "group rounded-card border bg-card p-4 transition-colors hover:border-primary/40",
        highlighted ? "border-primary/60 ring-1 ring-primary/30" : "border-border",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PlatformBadge platform={item.platform} />
        <span className="inline-flex min-w-0 items-center gap-1.5 text-body font-semibold text-foreground">
          <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{item.groupName ?? "Unnamed group"}</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          {item.incidents.length ? (
            <Badge variant="success" dot className="uppercase tracking-wide">
              Confirmed · {item.incidents[0]?.code}
            </Badge>
          ) : null}
          <StatusBadge status={item.status} />
        </span>
      </header>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3.5" aria-hidden />
          {item.senderName ?? "Sender not available"}
        </span>
        <time dateTime={time} title={formatFull(time)}>
          {formatDateTime(time)} <span className="opacity-70">({formatRelative(time)})</span>
        </time>
        <span className="font-mono text-[11px]">{item.reference}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/80">
          {reportTypeLabel(item.reportType)}
        </span>
        {item.office ? <Badge variant="outline">{item.office}</Badge> : null}
        {item.region ? <Badge variant="outline">{item.region}</Badge> : null}
        {item.locationCount ? (
          <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {item.locationCount} location{item.locationCount === 1 ? "" : "s"}
            {" · "}
            <span className={item.floodedCount ? "font-semibold text-warning" : ""}>{item.floodedCount} with flooding</span>
            {" · "}
            <span className={item.clearCount ? "text-success" : ""}>{item.clearCount} no flooding</span>
          </span>
        ) : null}
        {item.warningCount ? (
          <span className="inline-flex items-center gap-1 text-caption text-warning" title="Missing, ambiguous or flagged values">
            <AlertTriangle className="size-3.5" aria-hidden />
            {item.warningCount} flag{item.warningCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <p className="mt-2 whitespace-pre-line break-words font-mono text-[12.5px] leading-relaxed text-foreground/85">
        {item.preview}
      </p>

      {item.aiSummary ? (
        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
          <div className="mb-1 flex items-center gap-2">
            <AiTag label="AI Summary" />
            <span className="text-[10px] text-muted-foreground">Not verified</span>
          </div>
          <p className="text-body text-foreground">{ai?.overall}</p>
          {ai?.locationCount ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Covers {ai.locationCount} location{ai.locationCount === 1 ? "" : "s"} — open the report for the full per-location summary.
            </p>
          ) : null}
        </div>
      ) : item.status === "processing" ? (
        <p className="mt-3 text-caption text-primary">AI analysis is in progress.</p>
      ) : item.status === "received" ? (
        <p className="mt-3 text-caption text-muted-foreground">Waiting for AI processing.</p>
      ) : item.status !== "ignored" ? (
        <p className="mt-3 text-caption text-muted-foreground">AI summary is not available for this report.</p>
      ) : null}

      <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button size="sm" variant="primary" onClick={() => onOpen(item.id)} leftIcon={<Eye className="size-4" aria-hidden />}>
          View Report
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCreateIncident(item.id)}
          disabled={!incidentsEnabled || item.status === "processing"}
          title={!incidentsEnabled ? "Incident storage is not set up" : "Operator decision — reports never become incidents automatically"}
          leftIcon={item.incidents.length ? <Siren className="size-4" aria-hidden /> : <FilePlus2 className="size-4" aria-hidden />}
        >
          {item.incidents.length ? "Add Incident" : "Create Incident"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => review.mutate({ action: "approve" })}
          disabled={!reviewEnabled || !reviewable}
          isLoading={review.isPending}
          title={
            !reviewEnabled
              ? "Review actions require the OKB Bridge API to be configured"
              : !reviewable
                ? "Only AI-processed reports awaiting review can be marked reviewed"
                : undefined
          }
          leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
        >
          Mark Reviewed
        </Button>
        {review.isError ? <span className="text-caption text-danger">{review.error.message}</span> : null}
      </footer>
    </article>
  );
}
