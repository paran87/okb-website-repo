"use client";

import { useState } from "react";
import { Archive, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { AdminCard } from "@/features/admin/components/admin-ui";
import { useArchiveStatus, useTakeArchiveSnapshot } from "@/features/admin/hooks/use-admin";
import { cn } from "@/utils/cn";

const STAMP = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const BUTTON = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-caption font-semibold text-foreground hover:bg-muted disabled:opacity-60";
const PRIMARY = "inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-caption font-semibold text-primary-foreground disabled:opacity-60";

/** The accomplishment archive: its SQL until the tables exist, then its last snapshot and a "take one now" button. */
export function ArchiveCard() {
  const status = useArchiveStatus(true);
  const take = useTakeArchiveSnapshot();
  const [copied, setCopied] = useState(false);
  const s = status.data;
  const copy = async () => {
    if (!s?.sql) return;
    try {
      await navigator.clipboard.writeText(s.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* the SQL is selectable below */
    }
  };
  return (
    <AdminCard title="Accomplishment archive" icon={<Archive className="size-4" aria-hidden />}>
      <p className="text-caption text-muted-foreground">
        Once a day (around 11 PM Manila) the website saves every waterway and drainage line&apos;s figures from the OKB SSOT sheet and
        records what changed. The public Accomplishment page shows it under Updates → Archive.
      </p>
      {status.isLoading ? (
        <p className="mt-3 text-caption text-muted-foreground">Checking…</p>
      ) : status.error ? (
        <p className="mt-3 text-caption text-danger">{status.error.message}</p>
      ) : !s?.configured ? (
        <p className="mt-3 text-caption text-muted-foreground">Connect Supabase first (see Status).</p>
      ) : !s.ready ? (
        <>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-caption text-foreground">
            <li>Open the Supabase SQL editor of the OKB Bridge project.</li>
            <li>Paste the SQL below and press Run. It only adds three new tables.</li>
            <li>Come back, press Check again, then Take first snapshot: it saves today&apos;s figures as the starting point.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copy} disabled={!s.sql} className={PRIMARY}>
              <Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy SQL"}
            </button>
            {s.sqlEditorUrl ? (
              <a href={s.sqlEditorUrl} target="_blank" rel="noreferrer" className={BUTTON}>
                <ExternalLink className="size-4" aria-hidden /> Open SQL editor
              </a>
            ) : null}
            <button type="button" onClick={() => status.refetch()} className={BUTTON}>
              <RefreshCw className={cn("size-4", status.isFetching && "animate-spin")} aria-hidden /> Check again
            </button>
          </div>
          <pre className="mt-4 max-h-64 max-w-full overflow-auto rounded-xl bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{s.sql}</pre>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-caption text-foreground">
            {s.lastDay ? (
              <>
                <span className="font-semibold">{s.days}</span> day{s.days === 1 ? "" : "s"} archived · last snapshot{" "}
                <span className="font-semibold">{s.lastTakenAt ? STAMP.format(new Date(s.lastTakenAt)) : s.lastDay}</span>
              </>
            ) : (
              "The tables are ready. No snapshot yet."
            )}
          </p>
          <button type="button" onClick={() => take.mutate()} disabled={take.isPending} className={PRIMARY}>
            {take.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Archive className="size-4" aria-hidden />}
            {s.lastDay ? "Take a snapshot now" : "Take first snapshot"}
          </button>
          {take.data ? (
            <p className="text-caption text-success">
              Saved {take.data.day}: {take.data.records} records
              {take.data.baseline ? " as the starting point." : `, ${take.data.changes} change${take.data.changes === 1 ? "" : "s"} since the last snapshot.`}
            </p>
          ) : null}
          {take.error ? <p className="text-caption text-danger">{take.error.message}</p> : null}
        </div>
      )}
    </AdminCard>
  );
}
