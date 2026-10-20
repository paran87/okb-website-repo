"use client";

import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, Camera, CheckCircle2, ChevronRight, ImagePlus, Loader2, Pencil, Trash2, UserRound, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { MAX_PHOTOS } from "../lib/options";
import type { MyFloodReport, PublicFloodReport } from "../types";
import { BottomSheet } from "./bottom-sheet";
import { reportColor } from "./flood-map";

/** Where one of the sender's reports stands, in a few words. */
export function myReportState(r: PublicFloodReport): { label: string; tone: string } {
  if (r.status === "rejected" || r.status === "ignored") return { label: "Removed by OKB", tone: "bg-slate-200 text-slate-700" };
  if (r.receded) return { label: "Receded", tone: "bg-teal-100 text-teal-800" };
  if (r.expired) return { label: "Cleared from the map", tone: "bg-slate-100 text-slate-600" };
  return { label: r.verified ? "On the map · verified" : "On the map", tone: "bg-red-100 text-red-700" };
}

/**
 * The sender's own controls on a report sent from this phone: mark it receded, edit the answers, manage the
 * photos, delete it. Destructive steps ask once more.
 */
export function MyReportActions({
  report,
  busy,
  onReceded,
  onEdit,
  onPhotos,
  onDelete,
}: {
  report: MyFloodReport;
  busy: boolean;
  /** "now", or "pick" to choose the time in the edit form. */
  onReceded: (when: "now" | "pick") => void;
  onEdit: () => void;
  onPhotos: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState<"receded" | "delete" | null>(null);
  const state = myReportState(report);
  const stillFlooded = report.editable && !report.receded && !report.expired;
  return (
    <section className="space-y-3 rounded-2xl border-2 border-blue-600/30 bg-blue-50 p-3" aria-label="Your report">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white">
          <UserRound className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">Your report</p>
          <p className="text-xs text-slate-600">
            Only this phone can change it
            {report.editedAt
              ? ` · edited ${
                  Date.now() - Date.parse(report.editedAt) < 60_000
                    ? "just now"
                    : formatDistanceToNowStrict(new Date(report.editedAt), { addSuffix: true })
                }`
              : ""}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", state.tone)}>{state.label}</span>
      </div>

      {!report.editable ? (
        <p className="text-sm text-slate-700">OKB operators took this report off the map, so it can no longer be edited. You can still delete it.</p>
      ) : null}

      {stillFlooded ? (
        confirm === "receded" ? (
          <div className="space-y-2 rounded-xl bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">When did the flood go down?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onReceded("now")}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 font-bold text-white active:bg-teal-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Just now
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReceded("pick")}
                className="h-12 rounded-xl border border-slate-300 font-semibold text-slate-900 active:bg-slate-100"
              >
                Earlier…
              </button>
            </div>
            <button type="button" onClick={() => setConfirm(null)} className="h-10 w-full text-sm font-semibold text-slate-600">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm("receded")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-base font-bold text-white shadow active:bg-teal-700"
          >
            <CheckCircle2 className="size-5" aria-hidden />
            The flood has receded
          </button>
        )
      ) : null}

      {report.editable ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-semibold text-slate-900 ring-1 ring-slate-300 active:bg-slate-100"
          >
            <Pencil className="size-4" aria-hidden />
            Edit details
          </button>
          <button
            type="button"
            onClick={onPhotos}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-semibold text-slate-900 ring-1 ring-slate-300 active:bg-slate-100"
          >
            <Camera className="size-4" aria-hidden />
            Photos ({report.photos.length})
          </button>
        </div>
      ) : null}

      {confirm === "delete" ? (
        <div className="space-y-2 rounded-xl bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Delete this report and its photos for good?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-12 rounded-xl border border-slate-300 font-semibold text-slate-900">
              Keep it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-bold text-white active:bg-red-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm("delete")}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-red-600 active:bg-red-50"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete report
        </button>
      )}
    </section>
  );
}

/** Full-screen photo manager for one of the sender's reports: delete photos, add up to five in all. */
export function MyReportPhotos({
  report,
  busy,
  error,
  onBack,
  onRemove,
  onAdd,
}: {
  report: MyFloodReport;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const last = report.photos.length <= 1;
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-100 text-slate-900">
      <header className="flex shrink-0 items-center gap-2 bg-black px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <button type="button" onClick={onBack} aria-label="Back" className="flex size-11 items-center justify-center rounded-full bg-white/15">
          <ArrowLeft className="size-6" aria-hidden />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">Your photos</h2>
          <p className="truncate text-xs text-white/70">{report.locationText}</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            {report.photos.map((p, i) => (
              <div key={p.key} className="relative overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-300">
                {/* eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own route */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                {confirm === p.key ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-2">
                    <p className="text-sm font-semibold text-white">Delete this photo?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-lg bg-white px-3 text-sm font-semibold text-slate-900">
                        Keep
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setConfirm(null);
                          onRemove(p.key);
                        }}
                        className="h-10 rounded-lg bg-red-600 px-3 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy || last}
                    onClick={() => setConfirm(p.key)}
                    aria-label={`Delete photo ${i + 1}`}
                    className="absolute right-1.5 top-1.5 flex size-10 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-40"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                )}
              </div>
            ))}
            {report.photos.length < MAX_PHOTOS ? (
              <button
                type="button"
                disabled={busy}
                onClick={onAdd}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-400 text-sm font-semibold text-slate-700 active:bg-slate-200 disabled:opacity-60"
              >
                <ImagePlus className="size-7" aria-hidden />
                Add photos
                <span className="text-xs font-normal text-slate-500">up to {MAX_PHOTOS - report.photos.length} more</span>
              </button>
            ) : null}
          </div>
          {last ? <p className="text-xs text-slate-500">A report needs at least one photo. To remove it, delete the whole report.</p> : null}
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** "My reports": every report sent from this phone, newest first. */
export function MyReportsSheet({
  open,
  onClose,
  reports,
  loading,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  reports: MyFloodReport[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="My reports">
      {loading && !reports.length ? (
        <p className="flex items-center gap-2 py-4 text-sm text-slate-600">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading your reports…
        </p>
      ) : !reports.length ? (
        <p className="py-4 text-sm text-slate-600">No reports from this phone yet. Reports you send can be edited or deleted here.</p>
      ) : (
        <ul className="space-y-2 pb-2">
          {reports.map((r) => {
            const state = myReportState(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-2 text-left active:bg-slate-50"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-200" style={{ boxShadow: `0 0 0 3px ${reportColor(r)}` }}>
                    {r.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own route
                      <img src={r.photos[0].url} alt="" className="size-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-900">{r.locationText}</span>
                    <span className="block truncate text-sm text-slate-600">
                      {r.levelLabel ?? "Flood"} · {formatDistanceToNowStrict(new Date(r.reportedAt), { addSuffix: true })}
                    </span>
                    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", state.tone)}>{state.label}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="pb-2 text-xs text-slate-500">
        Your reports are linked to this phone&apos;s browser. Clearing the browser&apos;s data or using another phone removes this list
        (the reports stay on the map).
      </p>
    </BottomSheet>
  );
}
