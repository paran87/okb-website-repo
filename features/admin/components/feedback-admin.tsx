"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ExternalLink, Loader2, Mail, MonitorSmartphone, Search, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { adminApi, AdminApiError } from "@/features/admin/api";
import { Notice, Segmented, SkeletonBlock } from "@/features/admin/components/admin-ui";
import {
  areaLabel,
  categoryLabel,
  FEEDBACK_STATUSES,
  type FeedbackItem,
  type FeedbackList,
  type FeedbackStatus,
} from "@/features/feedback/lib/options";

type Filter = "open" | FeedbackStatus | "all";
const FILTERS = [
  { value: "open" as const, label: "Open" },
  { value: "new" as const, label: "New" },
  { value: "in_progress" as const, label: "In progress" },
  { value: "fixed" as const, label: "Fixed" },
  { value: "wont_fix" as const, label: "Won't fix" },
  { value: "all" as const, label: "All" },
];

const STATUS_TONE: Record<FeedbackStatus, string> = {
  new: "bg-danger/15 text-danger",
  in_progress: "bg-warning/15 text-warning",
  fixed: "bg-success/15 text-success",
  wont_fix: "bg-muted text-muted-foreground",
};

const listKey = (filter: Filter) => ["admin", "feedback", filter] as const;
const manila = (iso: string) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function FeedbackCard({ item, onChanged, onDeleted }: { item: FeedbackItem; onChanged: (i: FeedbackItem) => void; onDeleted: (id: string) => void }) {
  const [note, setNote] = useState(item.adminNote ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const patch = async (body: { status?: FeedbackStatus; adminNote?: string }, label: string) => {
    setBusy(label);
    setError(null);
    try {
      onChanged(await adminApi<FeedbackItem>(`/api/admin/feedback/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }));
    } catch (e) {
      setError(errorText(e, "The change could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setError(null);
    try {
      await adminApi(`/api/admin/feedback/${item.id}`, { method: "DELETE" });
      onDeleted(item.id);
    } catch (e) {
      setError(errorText(e, "The report could not be deleted."));
      setBusy(null);
    }
  };

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        <span className={cn("rounded-full px-2 py-0.5", STATUS_TONE[item.status])}>{FEEDBACK_STATUSES.find((s) => s.id === item.status)?.label}</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{categoryLabel(item.category)}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{areaLabel(item.area)}</span>
        <span className="ml-auto font-mono text-muted-foreground">{item.reference}</span>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-body text-foreground">{item.message}</p>

      <div className="mt-3 space-y-1.5 text-caption text-muted-foreground">
        <a
          href={item.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-10 items-center gap-1.5 break-all font-semibold text-primary hover:underline"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          {item.pageTitle ? `${item.pageTitle} · ` : ""}
          {item.pageUrl}
        </a>
        <p>
          Sent {manila(item.createdAt)} ({formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })})
        </p>
        {item.device ? (
          <p className="flex items-center gap-1.5">
            <MonitorSmartphone className="size-4 shrink-0" aria-hidden />
            {item.device}
            {item.screen ? ` · screen ${item.screen}` : ""}
          </p>
        ) : null}
        {item.contact ? (
          <p className="flex items-center gap-1.5 break-all text-foreground">
            <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            Reply to: <span className="font-semibold">{item.contact}</span>
          </p>
        ) : (
          <p>No contact given (anonymous).</p>
        )}
        {item.handledBy ? (
          <p>
            Last changed by {item.handledBy}
            {item.resolvedAt ? ` · closed ${manila(item.resolvedAt)}` : ""}
          </p>
        ) : null}
      </div>

      {item.screenshotUrl ? (
        <a href={item.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 block w-fit" aria-label="Open the screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element -- served by our own admin route */}
          <img src={item.screenshotUrl} alt="Screenshot sent with the report" loading="lazy" className="max-h-56 rounded-xl border border-border object-contain" />
        </a>
      ) : null}

      <div className="mt-4 space-y-3 border-t border-border pt-3">
        <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEEDBACK_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={item.status === s.id}
              disabled={busy !== null}
              onClick={() => item.status !== s.id && void patch({ status: s.id }, s.id)}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-lg border text-caption font-semibold transition-colors disabled:opacity-60",
                item.status === s.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {busy === s.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {s.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor={`note-${item.id}`} className="mb-1 block text-caption font-semibold text-foreground">
            Admin note <span className="font-normal text-muted-foreground">(what was done; only admins see it)</span>
          </label>
          <textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 2000))}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[16px] text-foreground sm:text-body"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null || note === (item.adminNote ?? "")}
              onClick={() => void patch({ adminNote: note }, "note")}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-caption font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy === "note" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save note
            </button>
            {confirm ? (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void remove()}
                  className="ml-auto flex h-10 items-center gap-1.5 rounded-lg bg-danger px-4 text-caption font-semibold text-white disabled:opacity-60"
                >
                  {busy === "delete" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                  Delete for good
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="h-10 rounded-lg px-3 text-caption font-semibold text-muted-foreground">
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="ml-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-caption font-semibold text-danger hover:bg-danger/10"
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </button>
            )}
          </div>
        </div>
        {error ? <p className="text-caption font-medium text-danger">{error}</p> : null}
      </div>
    </li>
  );
}

/** Admin → Feedback: "Report a problem" messages from the website, Command Center and OKB Mobile. */
export function FeedbackAdmin({ onOpenSetup }: { onOpenSetup: () => void }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: listKey(filter),
    queryFn: () => adminApi<FeedbackList>(`/api/admin/feedback?status=${filter}`),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
  const items = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const all = list.data?.items ?? [];
    if (!terms.length) return all;
    return all.filter((i) => {
      const text = [i.reference, i.message, i.pageUrl, i.pageTitle, i.contact, i.adminNote, categoryLabel(i.category), areaLabel(i.area)]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [list.data, q]);

  const changed = (item: FeedbackItem) => {
    queryClient.setQueryData<FeedbackList>(listKey(filter), (old) =>
      old ? { ...old, items: old.items.map((i) => (i.id === item.id ? item : i)) } : old,
    );
    void queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] });
  };
  const deleted = (id: string) => {
    queryClient.setQueryData<FeedbackList>(listKey(filter), (old) => (old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old));
    void queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] });
  };

  const notReady = list.error instanceof AdminApiError && (list.error.reason === "db_not_ready" || list.error.reason === "db_not_configured");

  return (
    <div className="space-y-4">
      <p className="text-caption text-muted-foreground">
        Problems visitors reported with “Report a problem” (website footer and menu, Command Center header, OKB Mobile help). Move each one
        to In progress while you work on it and to Fixed when it is done.
        {list.data ? <span className="font-semibold text-foreground"> {list.data.open} open.</span> : null}
      </p>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Segmented value={filter} options={FILTERS} onChange={setFilter} label="Show" className="lg:w-auto" />
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <span className="sr-only">Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search message, page, reference…"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-[16px] text-foreground sm:text-body"
          />
        </label>
      </div>

      {list.error ? (
        <Notice
          tone={notReady ? "warning" : "danger"}
          title={notReady ? "Feedback is not set up yet" : "Feedback could not be loaded"}
          action={
            notReady ? (
              <button type="button" onClick={onOpenSetup} className="h-10 rounded-lg bg-warning px-4 text-caption font-semibold text-white">
                Open Setup
              </button>
            ) : null
          }
        >
          {notReady ? "Run the setup SQL again in Admin → Setup: it adds the feedback table (nothing existing is changed)." : list.error.message}
        </Notice>
      ) : null}

      {list.isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : list.data && !items.length ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-caption text-muted-foreground">
          {q ? "Nothing matches the search." : filter === "open" ? "No open reports. Everything reported has been handled." : "No reports here."}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <FeedbackCard key={`${item.id}:${item.updatedAt}`} item={item} onChanged={changed} onDeleted={deleted} />
          ))}
        </ul>
      )}
    </div>
  );
}
