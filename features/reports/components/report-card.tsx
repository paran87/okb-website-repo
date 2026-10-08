"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { ReportListItem } from "@/features/reports/types";
import { formatDateTime, formatFull, formatRelative } from "@/features/reports/lib/format";
import { reportTypeLabel } from "@/features/reports/lib/labels";
import { PlatformBadge, StatusBadge } from "@/features/reports/components/report-ui";

interface ReportCardProps {
  item: ReportListItem;
  onOpen: (id: string) => void;
  highlighted?: boolean;
}

/** Message text clamped to a few lines, with Show more / Show less when it does not fit. */
function MessageText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="mt-1.5 sm:mt-2">
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-line break-words font-mono text-[11px] leading-snug text-foreground/85 sm:text-[12.5px] sm:leading-relaxed",
          !expanded && "line-clamp-4 sm:line-clamp-3",
        )}
      >
        {text}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="-ml-1 mt-0.5 inline-flex min-h-10 items-center gap-1 rounded-md px-1 text-[11px] font-semibold text-primary hover:bg-primary/10 sm:text-caption"
        >
          {expanded ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function ReportCard({ item, onOpen, highlighted }: ReportCardProps) {
  const time = item.messageTime ?? item.receivedAt;

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
          {/* Phones: no "Needs review" badge (reviewing happens in the opened report). */}
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
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/80 sm:text-[11px]">
          {reportTypeLabel(item.reportType)}
        </span>
        {item.office ? <Badge variant="outline" className="px-2 py-0 text-[10px] sm:px-2.5 sm:py-0.5 sm:text-caption">{item.office}</Badge> : null}
        {item.region ? <Badge variant="outline" className="px-2 py-0 text-[10px] sm:px-2.5 sm:py-0.5 sm:text-caption">{item.region}</Badge> : null}
      </div>

      <MessageText text={item.message} />

      <footer className="mt-3 hidden flex-wrap items-center gap-2 border-t border-border pt-3 sm:flex">
        <Button size="sm" variant="primary" onClick={() => onOpen(item.id)} leftIcon={<Eye className="size-4" aria-hidden />}>
          View Report
        </Button>
      </footer>
    </article>
  );
}
