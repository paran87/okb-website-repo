"use client";

import { useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Camera, ExternalLink, ImagePlus, Loader2, MapPin, Pencil, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { adminApi } from "@/features/admin/api";
import { AdminSheet } from "@/features/admin/components/admin-sheet";
import { AdminCard, Notice, Segmented, SkeletonBlock } from "@/features/admin/components/admin-ui";
import { myReportState } from "@/features/flood-report/components/my-report";
import { ReportForm } from "@/features/flood-report/components/report-form";
import { uploadPhoto } from "@/features/flood-report/lib/api";
import { withExif } from "@/features/flood-report/lib/exif";
import { MAX_PHOTOS } from "@/features/flood-report/lib/options";
import type { AdminMobileReport, FloodReportFormValues, UploadedPhoto } from "@/features/flood-report/types";

type Days = "1" | "7" | "30";
const PERIODS = [
  { value: "1" as const, label: "24 h" },
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
];

const listKey = (days: Days) => ["admin", "mobile-reports", days] as const;

/** "Oct 20, 2026, 9:27 AM" in Philippine time, whatever the operator's device is set to. */
const manila = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

function keptPhotos(r: AdminMobileReport): UploadedPhoto[] {
  return r.photos.map((p) => ({
    key: p.key,
    latitude: p.latitude ?? r.latitude,
    longitude: p.longitude ?? r.longitude,
    accuracyM: p.accuracyM,
    takenAt: p.takenAt ?? r.reportedAt,
  }));
}

/** A picked image as a JPEG of at most 1600 px, with the report's position written as EXIF. */
async function toReportJpeg(file: File, r: AdminMobileReport): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image could not be read."))), "image/jpeg", 0.85),
  );
  return withExif(jpeg, { latitude: r.latitude, longitude: r.longitude, accuracyM: null, takenAt: new Date() });
}

/** Admin → Reports: reports the public sent from the OKB mobile page; operators edit, re-photo or delete them. */
export function MobileReportsAdmin() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<Days>("7");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const list = useQuery({
    queryKey: listKey(days),
    queryFn: () => adminApi<AdminMobileReport[]>(`/api/admin/mobile-reports?days=${days}`),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
  const reports = useMemo(() => {
    const all = list.data ?? [];
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return all;
    return all.filter((r) => {
      const text = [r.locationText, r.area, r.landmark, r.senderName, r.contactNumber, r.reference, r.remarks].join(" ").toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [list.data, q]);
  const open = (list.data ?? []).find((r) => r.id === openId) ?? null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "mobile-reports"] });
    void queryClient.invalidateQueries({ queryKey: ["flood-reports"] });
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
  };

  const save = async (r: AdminMobileReport, values: FloodReportFormValues, photos: UploadedPhoto[], label: string) => {
    setBusy(label);
    setError(null);
    try {
      const updated = await adminApi<AdminMobileReport>(`/api/admin/mobile-reports/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...values, photos }),
      });
      queryClient.setQueryData<AdminMobileReport[]>(listKey(days), (old) =>
        old ? old.map((x) => (x.id === r.id ? { ...x, ...updated } : x)) : old,
      );
      refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "The changes could not be saved.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addPhotos = async (r: AdminMobileReport, files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - r.photos.length;
    setBusy("photos");
    setError(null);
    try {
      const added: UploadedPhoto[] = [];
      for (const file of [...files].slice(0, room)) {
        const key = await uploadPhoto(r.id, await toReportJpeg(file, r), () => undefined);
        added.push({ key, latitude: r.latitude, longitude: r.longitude, accuracyM: null, takenAt: new Date().toISOString() });
      }
      setBusy(null);
      await save(r, r.form, [...keptPhotos(r), ...added], "photos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The photo could not be added.");
      setBusy(null);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async (r: AdminMobileReport) => {
    setBusy("delete");
    setError(null);
    try {
      await adminApi(`/api/admin/mobile-reports/${r.id}`, { method: "DELETE" });
      queryClient.setQueryData<AdminMobileReport[]>(listKey(days), (old) => (old ? old.filter((x) => x.id !== r.id) : old));
      setOpenId(null);
      setConfirm(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be deleted.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <AdminCard bodyClassName="space-y-3">
        <p className="text-caption text-muted-foreground">
          Flood reports the public sent from the OKB mobile page. Correct the details, remove or add photos, or delete a report
          (test, spam, duplicate). Changes show on the public map and in the Command Center right away.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={days} options={PERIODS} onChange={setDays} label="Period" />
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Search reports</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search place, sender, number, RPT-…"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </AdminCard>

      {list.isError ? (
        <Notice tone="danger" title="Mobile reports could not be loaded">
          {list.error.message}
        </Notice>
      ) : list.isPending ? (
        <div className="space-y-2">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : !reports.length ? (
        <AdminCard>
          <p className="text-center text-caption text-muted-foreground">
            {q ? "No report matches the search." : "No reports from the OKB mobile page in this period."}
          </p>
        </AdminCard>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {reports.map((r) => {
            const state = myReportState(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(r.id);
                    setError(null);
                    setConfirm(null);
                  }}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-2.5 text-left shadow-sm transition-colors hover:bg-muted/40"
                >
                  <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {r.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own route
                      <img src={r.photos[0].url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : null}
                    <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
                      <Camera className="size-3" aria-hidden />
                      {r.photos.length}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block truncate font-semibold text-foreground">{r.locationText}</span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {r.levelLabel ?? "Flood"}
                      {r.area ? ` · ${r.area}` : ""}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {r.senderName ?? "Anonymous"}
                      {r.contactNumber ? ` · ${r.contactNumber}` : ""} · {formatDistanceToNowStrict(new Date(r.reportedAt), { addSuffix: true })}
                    </span>
                    <span className="flex flex-wrap gap-1 pt-0.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", state.tone)}>{state.label}</span>
                      {r.status === "needs_review" ? (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">Needs review</span>
                      ) : null}
                      {r.inConsolidated ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">In WhatsApp report</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AdminSheet
        open={Boolean(open) && !editing}
        onClose={() => setOpenId(null)}
        title={open?.locationText ?? "Report"}
        description={open ? `${open.reference} · ${open.senderName ?? "Anonymous"}${open.contactNumber ? ` · ${open.contactNumber}` : ""}` : undefined}
        wide
        footer={
          open ? (
            confirm === "report" ? (
              <>
                <span className="mr-auto text-caption text-foreground">Delete this report and its photos for good?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>
                  Keep
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={busy === "delete"}
                  onClick={() => void remove(open)}
                  leftIcon={<Trash2 className="size-4" aria-hidden />}
                >
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirm("report")} leftIcon={<Trash2 className="size-4" aria-hidden />}>
                  Delete report
                </Button>
                <a
                  href={`${ROUTES.reports}/${open.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-caption font-semibold text-primary hover:bg-muted"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Command Center
                </a>
                <Button
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setEditing(true);
                  }}
                  leftIcon={<Pencil className="size-4" aria-hidden />}
                >
                  Edit details
                </Button>
              </>
            )
          ) : null
        }
      >
        {open ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className={cn("rounded-full px-2 py-0.5", myReportState(open).tone)}>{myReportState(open).label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Status: {open.status.replaceAll("_", " ")}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {open.hasEditKey ? "Sender can still edit" : "Sender cannot edit (sent before edit keys)"}
              </span>
              {open.inConsolidated ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">In WhatsApp report</span> : null}
            </div>

            <dl className="grid gap-x-4 gap-y-1.5 text-caption sm:grid-cols-2">
              {[
                ["Flood height", open.levelLabel ? `${open.levelLabel}${open.depthM !== null ? ` (${Math.round(open.depthM * 100)} cm)` : ""}` : null],
                ["Road", open.roadStatus],
                ["Weather", open.weather],
                ["Started", open.startedAt ? manila(open.startedAt) : null],
                ["Receded", open.recededAt ? manila(open.recededAt) : "Not reported"],
                ["Sent", manila(open.reportedAt)],
                ["Landmark", open.landmark],
                ["Area", open.area],
                ["Remarks", open.remarks],
                ["Last edit", open.operatorEditedBy ? `by operator ${open.operatorEditedBy}` : open.editedAt ? "by the sender" : null],
              ]
                .filter((row): row is [string, string] => Boolean(row[1]))
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words text-foreground">{v}</dd>
                  </div>
                ))}
            </dl>
            <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {open.latitude.toFixed(5)}, {open.longitude.toFixed(5)}
            </p>

            <section className="space-y-2">
              <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Photos ({open.photos.length}/{MAX_PHOTOS})
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {open.photos.map((p, i) => (
                  <div key={p.key} className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border">
                    <a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open photo ${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own route */}
                      <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                    </a>
                    {confirm === p.key ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-2">
                        <p className="text-caption font-semibold text-white">Delete this photo?</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-lg bg-white px-3 text-caption font-semibold text-slate-900">
                            Keep
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              setConfirm(null);
                              void save(open, open.form, keptPhotos(open).filter((x) => x.key !== p.key), "photos");
                            }}
                            className="h-10 rounded-lg bg-red-600 px-3 text-caption font-bold text-white disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy !== null || open.photos.length <= 1}
                        onClick={() => setConfirm(p.key)}
                        aria-label={`Delete photo ${i + 1}`}
                        title={open.photos.length <= 1 ? "A report needs at least one photo. Delete the report instead." : "Delete photo"}
                        className="absolute right-1.5 top-1.5 flex size-10 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-40"
                      >
                        <X className="size-5" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
                {open.photos.length < MAX_PHOTOS ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => fileInput.current?.click()}
                    className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-caption font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
                  >
                    {busy === "photos" ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
                    Add photos
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void addPhotos(open, e.target.files)}
              />
            </section>
            {error ? <p className="rounded-lg bg-danger/10 p-3 text-caption font-medium text-danger">{error}</p> : null}
          </div>
        ) : null}
      </AdminSheet>

      {editing && open ? (
        // Its own layer above the admin header (the form is a full-screen page).
        <div className="fixed inset-0 z-[70]">
          <ReportForm
            key={open.id}
            photos={open.photos.map((p) => ({ id: p.key, url: p.url, latitude: p.latitude, longitude: p.longitude, accuracyM: p.accuracyM, takenAt: p.takenAt }))}
            place={open.form.place}
            initial={open.form}
            editHeading={{ title: "Edit report (operator)", subtitle: `${open.reference} · saved as your correction` }}
            error={error}
            onBack={() => setEditing(false)}
            onSubmit={(values) => {
              const { website: _website, ...form } = values;
              void _website;
              void save(open, form, keptPhotos(open), "edit").then((ok) => ok && setEditing(false));
            }}
          />
          {busy === "edit" ? (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 text-white" role="status">
              <Loader2 className="mr-2 size-6 animate-spin" aria-hidden /> Saving…
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
