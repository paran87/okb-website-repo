"use client";

import { useCallback, useEffect, useState } from "react";
import { Hand, Heart, Loader2, MessageCircle, Pencil, Send, ThumbsUp, Trash2, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

type Reaction = "like" | "love" | "clap" | "wow";

interface Comment {
  id: number;
  body: string;
  createdAt: string;
  /** Written from this browser: it can be edited or deleted here. */
  mine: boolean;
}

interface Engagement {
  enabled: boolean;
  counts: Record<Reaction, number>;
  mine: Reaction | null;
  comments: Comment[];
}

const REACTIONS: { id: Reaction; label: string; icon: LucideIcon; color: string }[] = [
  { id: "like", label: "Like", icon: ThumbsUp, color: "#60a5fa" },
  { id: "love", label: "Love", icon: Heart, color: "#f87171" },
  { id: "clap", label: "Salute", icon: Hand, color: "#fbbf24" },
  { id: "wow", label: "Wow", icon: Zap, color: "#c084fc" },
];

const VISITOR_KEY = "okb-gallery-visitor";
const COMMENT_MAX = 500;

/** A random id kept in this browser: one reaction per person per item, never a name. */
function visitorId(): string {
  try {
    const saved = window.localStorage.getItem(VISITOR_KEY);
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

const ago = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

async function call<T>(init?: RequestInit, query = ""): Promise<T> {
  const res = await fetch(`/api/gallery/engagement${query}`, init);
  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: { message?: string } } | null;
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Something went wrong. Please try again.");
  return json.data as T;
}

/** Reactions and anonymous comments for one Gallery item, shown in the full-screen viewer. */
export function GalleryEngagement({ itemKey }: { itemKey: string }) {
  const [data, setData] = useState<Engagement | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  /** The own comment being edited (with its draft), or waiting for the delete confirmation. */
  const [editing, setEditing] = useState<{ id: number; draft: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    setEditing(null);
    setConfirmDelete(null);
    setRowError(null);
    setData(null);
    setFailed(false);
    setText("");
    setNotice(null);
    call<Engagement>(undefined, `?key=${encodeURIComponent(itemKey)}&visitor=${visitorId()}`)
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [itemKey]);

  const react = useCallback(
    async (reaction: Reaction) => {
      if (!data?.enabled) return;
      const next = data.mine === reaction ? null : reaction;
      const before = data;
      // Update straight away; roll back if the server says no.
      const counts = { ...data.counts };
      if (data.mine) counts[data.mine] = Math.max(0, counts[data.mine] - 1);
      if (next) counts[next]++;
      setData({ ...data, counts, mine: next });
      try {
        const fresh = await call<Engagement>({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "react", key: itemKey, visitor: visitorId(), reaction: next }) });
        setData(fresh);
      } catch (e) {
        setData(before);
        setNotice({ tone: "error", text: e instanceof Error ? e.message : "Could not save your reaction." });
      }
    },
    [data, itemKey],
  );

  const post = async () => {
    if (!data || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const { comment } = await call<{ comment: Comment }>({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", key: itemKey, visitor: visitorId(), body: text }) });
      setData({ ...data, comments: [comment, ...data.comments] });
      setText("");
      setNotice({ tone: "ok", text: "Thanks! Posted as Anonymous. You can edit or delete it from this browser." });
    } catch (e) {
      setNotice({ tone: "error", text: e instanceof Error ? e.message : "The comment could not be posted." });
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!data || !editing || rowBusy !== null) return;
    setRowBusy(editing.id);
    setRowError(null);
    try {
      const { comment } = await call<{ comment: Comment }>({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit-comment", key: itemKey, visitor: visitorId(), id: editing.id, body: editing.draft }),
      });
      setData((d) => (d ? { ...d, comments: d.comments.map((c) => (c.id === comment.id ? comment : c)) } : d));
      setEditing(null);
    } catch (e) {
      setRowError({ id: editing.id, text: e instanceof Error ? e.message : "The comment could not be saved." });
    } finally {
      setRowBusy(null);
    }
  };

  const remove = async (id: number) => {
    if (!data || rowBusy !== null) return;
    setRowBusy(id);
    setRowError(null);
    try {
      await call<{ deleted: boolean }>({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-comment", key: itemKey, visitor: visitorId(), id }),
      });
      setData((d) => (d ? { ...d, comments: d.comments.filter((c) => c.id !== id) } : d));
      setConfirmDelete(null);
    } catch (e) {
      setRowError({ id, text: e instanceof Error ? e.message : "The comment could not be deleted." });
    } finally {
      setRowBusy(null);
    }
  };

  if (failed) return null;
  if (!data) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading reactions and comments…
      </div>
    );
  }
  if (!data.enabled) return <p className="mt-3 text-xs text-white/50">Reactions and comments will be available soon.</p>;

  return (
    <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
      {/* Reactions: always in view. */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {REACTIONS.map(({ id, label, icon: Icon, color }) => {
          const on = data.mine === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => react(id)}
              aria-pressed={on}
              aria-label={`${label} (${data.counts[id]})`}
              className={cn(
                "inline-flex h-10 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
                on ? "border-transparent text-[#001a3a]" : "border-white/25 text-white hover:bg-white/10",
              )}
              style={on ? { backgroundColor: color } : undefined}
            >
              <Icon className="size-4" style={on ? undefined : { color }} fill={on && id === "love" ? "currentColor" : "none"} aria-hidden />
              <span className="tabular-nums">{data.counts[id]}</span>
            </button>
          );
        })}
      </div>

      {/* Comments: shown straight away, scrolling on their own, above the box to write in. */}
      <p className="mt-3 flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/70">
        <MessageCircle className="size-3.5" aria-hidden /> Comments <span className="tabular-nums text-[#fcd116]">{data.comments.length}</span>
      </p>
      <div className="mt-1.5 min-h-[3.5rem] flex-1 overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label="Comments">
        {data.comments.length ? (
          <ul className="space-y-2">
            {data.comments.map((c) => {
              const isEditing = editing?.id === c.id;
              const busyRow = rowBusy === c.id;
              return (
                <li key={c.id} className={cn("rounded-lg px-3 py-2", c.mine ? "bg-[#fcd116]/[0.09] ring-1 ring-[#fcd116]/25" : "bg-white/[0.07]")}>
                  <p className="flex items-baseline gap-2 text-xs">
                    <span className="font-bold text-white">Anonymous</span>
                    {c.mine ? <span className="rounded-full bg-[#fcd116] px-1.5 text-[10px] font-bold uppercase text-[#001a3a]">You</span> : null}
                    <span className="text-white/45">{ago(c.createdAt)}</span>
                  </p>
                  {isEditing ? (
                    <form
                      className="mt-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveEdit();
                      }}
                    >
                      <label className="sr-only" htmlFor={`edit-comment-${c.id}`}>
                        Edit your comment
                      </label>
                      <textarea
                        id={`edit-comment-${c.id}`}
                        value={editing.draft}
                        onChange={(e) => setEditing({ id: c.id, draft: e.target.value.slice(0, COMMENT_MAX) })}
                        rows={3}
                        autoFocus
                        className="w-full resize-none rounded-lg border border-white/25 bg-black/40 px-2.5 py-2 text-sm text-white focus:border-[#fcd116] focus:outline-none"
                      />
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <span className="mr-auto text-[11px] tabular-nums text-white/45">
                          {editing.draft.length}/{COMMENT_MAX}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                            setRowError(null);
                          }}
                          className="h-10 rounded-full px-3 text-sm font-semibold text-white/80 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={busyRow || !editing.draft.trim() || editing.draft.trim() === c.body}
                          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#fcd116] px-4 text-sm font-bold text-[#001a3a] disabled:opacity-50"
                        >
                          {busyRow ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/90">{c.body}</p>
                  )}
                  {c.mine && !isEditing ? (
                    confirmDelete === c.id ? (
                      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Confirm delete">
                        <span className="mr-auto text-xs font-semibold text-white/80">Delete this comment?</span>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="h-10 rounded-full px-3 text-sm font-semibold text-white/80 hover:bg-white/10"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(c.id)}
                          disabled={busyRow}
                          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#ef4444] px-4 text-sm font-bold text-white disabled:opacity-50"
                        >
                          {busyRow ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="mt-0.5 flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete(null);
                            setRowError(null);
                            setEditing({ id: c.id, draft: c.body });
                          }}
                          aria-label="Edit your comment"
                          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/75 hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                            setRowError(null);
                            setConfirmDelete(c.id);
                          }}
                          aria-label="Delete your comment"
                          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#fca5a5] hover:bg-white/10"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </button>
                      </div>
                    )
                  ) : null}
                  {rowError?.id === c.id ? (
                    <p role="status" className="mt-1 text-[11px] font-semibold text-[#fca5a5]">
                      {rowError.text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-3 text-center text-xs text-white/50">No comments yet. Be the first.</p>
        )}
      </div>

      {/* Write a comment: pinned at the bottom. */}
      <form
        className="mt-2 shrink-0 border-t border-white/10 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void post();
        }}
      >
        <label className="sr-only" htmlFor="gallery-comment">
          Write a comment
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="gallery-comment"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, COMMENT_MAX))}
            rows={1}
            placeholder="Write a comment as Anonymous…"
            className="max-h-24 min-h-10 w-full resize-none rounded-xl border border-white/25 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#fcd116] focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Post as Anonymous"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#fcd116] px-3.5 text-sm font-bold text-[#001a3a] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            <span className="hidden sm:inline">Post</span>
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          {notice ? (
            <span role="status" className={cn("font-semibold", notice.tone === "error" ? "text-[#fca5a5]" : "text-[#86efac]")}>
              {notice.text}
            </span>
          ) : (
            <span />
          )}
          <span className="tabular-nums text-white/45">
            {text.length}/{COMMENT_MAX}
          </span>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ grid and list summary */

export interface EngagementSummary {
  enabled: boolean;
  items: Record<string, { counts: Record<Reaction, number>; comments: number }>;
}

/** Reaction and comment counts of the items on screen; `refresh` re-reads them (after the viewer closes). */
export function useEngagementSummary(keys: string[]): { summary: EngagementSummary | null; refresh: () => void } {
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [tick, setTick] = useState(0);
  const joined = keys.join("\n");
  useEffect(() => {
    if (!joined) return;
    let live = true;
    const t = window.setTimeout(() => {
      call<EngagementSummary>({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "summary", keys: joined.split("\n") }) })
        .then((d) => live && setSummary(d))
        .catch(() => undefined);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [joined, tick]);
  return { summary, refresh: useCallback(() => setTick((n) => n + 1), []) };
}

/**
 * The reactions and comments of one item on its grid card or list row: visible at a glance so people are drawn to open
 * the picture. With nothing yet it invites the first reaction.
 */
export function EngagementBar({ stats, variant }: { stats: { counts: Record<Reaction, number>; comments: number } | undefined; variant: "grid" | "list" }) {
  const counts = stats?.counts ?? { like: 0, love: 0, clap: 0, wow: 0 };
  const comments = stats?.comments ?? 0;
  const total = REACTIONS.reduce((n, r) => n + counts[r.id], 0);
  const onPhoto = variant === "grid";
  const chip = onPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white text-[#14233a] shadow-sm ring-1 ring-black/10";
  return (
    <span className={cn("flex flex-wrap items-center gap-1", variant === "list" && "mt-1.5")} aria-label={`${total} reactions, ${comments} comments`}>
      {total > 0 ? (
        REACTIONS.filter((r) => counts[r.id] > 0).map(({ id, icon: Icon, color }) => (
          <span key={id} className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold tabular-nums", chip)}>
            <Icon className="size-3.5" style={{ color }} fill={id === "love" ? color : "none"} aria-hidden />
            {counts[id]}
          </span>
        ))
      ) : (
        <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold", chip)}>
          <Heart className="size-3.5 text-[#f87171]" aria-hidden /> React
        </span>
      )}
      <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold", comments > 0 ? "bg-[#fcd116] text-[#001a3a]" : chip)}>
        <MessageCircle className="size-3.5" aria-hidden />
        {comments > 0 ? comments : "Comment"}
      </span>
    </span>
  );
}
