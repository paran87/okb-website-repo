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
        "group rounded-card border bg-card p-2.5 transition-colors hover:border-primary/40 sm:p-4",
        highlighted ? "border-primary/60 ring-1 ring-primary/30" : "border-border",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-2">
        <PlatformBadge platform={item.platform} />
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground sm:text-body">
          <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{item.groupName ?? "Unnamed group"}</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          {item.incidents.length ? (
            <Badge variant="success" dot className="uppercase tracking-wide">
              Confirmed · {item.incidents[0]?.code}
            </Badge>
          ) : null}
          {/* Phones: no "Needs review" badge (the review actions are on larger screens and in the report). */}
          <StatusBadge
            status={item.status}
            className={cn("px-2 text-[10px] sm:px-2.5 sm:text-caption", item.status === "needs_review" && "hidden sm:inline-flex")}
          />
          {/* Phones: View sits here; the action row below is hidden. */}
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="-my-2 -mr-1 inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 sm:hidden"
          >
            <Eye className="size-3.5" aria-hidden />
            View
          </button>
        </span>
      </header>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:mt-1.5 sm:gap-x-4 sm:gap-y-1 sm:text-caption">
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3.5" aria-hidden />
          {item.senderName ?? "Sender not available"}
        </span>
        <time dateTime={time} title={formatFull(time)}>
          {formatDateTime(time)} <span className="opacity-70">({formatRelative(time)})</span>
        </time>
        <span className="font-mono text-[10px] sm:text-[11px]">{item.reference}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/80 sm:text-[11px]">
          {reportTypeLabel(item.reportType)}
        </span>
        {item.office ? <Badge variant="outline" className="px-2 py-0 text-[10px] sm:px-2.5 sm:py-0.5 sm:text-caption">{item.office}</Badge> : null}
        {item.region ? <Badge variant="outline" className="px-2 py-0 text-[10px] sm:px-2.5 sm:py-0.5 sm:text-caption">{item.region}</Badge> : null}
        {item.locationCount ? (
          <span className="inline-flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground sm:text-caption">
            <MapPin className="size-3.5" aria-hidden />
            {item.locationCount} location{item.locationCount === 1 ? "" : "s"}
            {" · "}
            <span className={item.floodedCount ? "font-semibold text-warning" : ""}>{item.floodedCount} with flooding</span>
            {" · "}
            <span className={item.clearCount ? "text-success" : ""}>{item.clearCount} no flooding</span>
          </span>
        ) : null}
        {item.warningCount ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-warning sm:text-caption" title="Missing, ambiguous or flagged values">
            <AlertTriangle className="size-3.5" aria-hidden />
            {item.warningCount} flag{item.warningCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 line-clamp-3 whitespace-pre-line break-words font-mono text-[11px] leading-snug text-foreground/85 sm:mt-2 sm:line-clamp-none sm:text-[12.5px] sm:leading-relaxed">
        {item.preview}
      </p>

      {item.aiSummary ? (
        <div className="mt-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-2.5 py-1.5 sm:mt-3 sm:px-3 sm:py-2">
          <div className="mb-0.5 flex items-center gap-2 sm:mb-1">
            <AiTag label="AI Summary" />
            <span className="text-[10px] text-muted-foreground">Not verified</span>
          </div>
          <p className="line-clamp-4 text-[12px] leading-snug text-foreground sm:line-clamp-none sm:text-body">{ai?.overall}</p>
          {ai?.locationCount ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-[11px]">
              Covers {ai.locationCount} location{ai.locationCount === 1 ? "" : "s"} — open the report for the full per-location summary.
            </p>
          ) : null}
        </div>
      ) : item.status === "processing" ? (
        <p className="mt-2 text-[11px] text-primary sm:mt-3 sm:text-caption">AI analysis is in progress.</p>
      ) : item.status === "received" ? (
        <p className="mt-2 text-[11px] text-muted-foreground sm:mt-3 sm:text-caption">Waiting for AI processing.</p>
      ) : item.status !== "ignored" ? (
        <p className="mt-2 text-[11px] text-muted-foreground sm:mt-3 sm:text-caption">AI summary is not available for this report.</p>
      ) : null}

      <footer className="mt-3 hidden flex-wrap items-center gap-2 border-t border-border pt-3 sm:flex">
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
