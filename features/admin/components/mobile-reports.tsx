"use client";

import { useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Camera, ExternalLink, Film, ImagePlus, Loader2, MapPin, MessageSquareText, Pencil, Play, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { adminApi } from "@/features/admin/api";
import { AdminSheet } from "@/features/admin/components/admin-sheet";
import { AdminCard, Notice, Segmented, SkeletonBlock } from "@/features/admin/components/admin-ui";
import { uploadReportMedia } from "@/features/admin/upload";
import { myReportState } from "@/features/flood-report/components/my-report";
import { SOURCE_COLOR, SOURCE_LABEL } from "@/features/flood-report/components/report-details";
import { ReportForm } from "@/features/flood-report/components/report-form";
import { uploadPhoto } from "@/features/flood-report/lib/api";
import { withExif } from "@/features/flood-report/lib/exif";
import { MAX_PHOTOS } from "@/features/flood-report/lib/options";
import type {
  AdminBridgeReport,
  AdminMobileReport,
  AdminReport,
  FloodReportFormValues,
  ReportPhoto,
  ReportSource,
  ReportVideo,
  UploadedPhoto,
} from "@/features/flood-report/types";

type Days = "1" | "7" | "30";
const PERIODS = [
  { value: "1" as const, label: "24 h" },
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
];
type SourceFilter = "all" | ReportSource;
const SOURCES = [
  { value: "all" as const, label: "All" },
  { value: "okb_mobile" as const, label: "OKB Mobile" },
  { value: "whatsapp" as const, label: "WhatsApp" },
  { value: "viber" as const, label: "Viber" },
];

const listKey = (days: Days) => ["admin", "mobile-reports", days] as const;

/** "Oct 20, 2026, 9:27 AM" in Philippine time, whatever the operator's device is set to. */
const manila = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

const sourceOf = (r: AdminReport): ReportSource => (r.kind === "mobile" ? "okb_mobile" : r.source);
const titleOf = (r: AdminReport) => (r.kind === "mobile" ? r.locationText : (r.locations[0]?.label ?? `${SOURCE_LABEL[r.source]} report`));
const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function keptPhotos(r: AdminMobileReport): UploadedPhoto[] {
  return r.photos.map((p) => ({
    key: p.key,
    latitude: p.latitude ?? r.latitude,
    longitude: p.longitude ?? r.longitude,
    accuracyM: p.accuracyM,
    takenAt: p.takenAt ?? r.reportedAt,
  }));
}

/** A picked image as a JPEG of at most 1600 px, with the report's position written as EXIF when it has one. */
async function toJpeg(file: File, at: { latitude: number; longitude: number } | null): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image could not be read."))), "image/jpeg", 0.85),
  );
  return at ? withExif(jpeg, { ...at, accuracyM: null, takenAt: new Date() }) : jpeg;
}

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp" };

/** A storage name for a picked video ("video.mp4"), or null when it is not a video R2 can serve. */
function videoName(file: File): string | null {
  const ext = /\.(mp4|m4v|mov|webm|3gp)$/i.exec(file.name)?.[1]?.toLowerCase() ?? VIDEO_TYPES[file.type];
  return ext ? `video.${ext}` : null;
}

/**
 * Admin → Reports: flood reports from the OKB mobile page and from the WhatsApp / Viber groups (OKB Bridge).
 * Operators correct mobile reports, add or remove photos and videos on any report, and delete reports.
 */
export function MobileReportsAdmin() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<Days>("7");
  const [source, setSource] = useState<SourceFilter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);

  const list = useQuery({
    queryKey: listKey(days),
    queryFn: () => adminApi<AdminReport[]>(`/api/admin/mobile-reports?days=${days}`),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
  const reports = useMemo(() => {
    const all = (list.data ?? []).filter((r) => source === "all" || sourceOf(r) === source);
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return all;
    return all.filter((r) => {
      const text = (
        r.kind === "mobile"
          ? [r.locationText, r.area, r.landmark, r.deo, r.senderName, r.contactNumber, r.reference, r.remarks]
          : [r.reference, r.groupName, r.senderName, r.text, ...r.locations.map((l) => l.label)]
      )
        .join(" ")
        .toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [list.data, q, source]);
  const open = (list.data ?? []).find((r) => r.id === openId) ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "mobile-reports"] });
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
      queryClient.setQueryData<AdminReport[]>(listKey(days), (old) =>
        old ? old.map((x) => (x.id === r.id && x.kind === "mobile" ? { ...x, ...updated, kind: "mobile", videos: x.videos } : x)) : old,
      );
      void refresh();
      return true;
    } catch (e) {
      setError(errorText(e, "The changes could not be saved."));
      return false;
    } finally {
      setBusy(null);
    }
  };

  /** Mobile reports: photos join the report's own list (at most 5, with the report's position). */
  const addPhotos = async (r: AdminMobileReport, files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - r.photos.length;
    setBusy("photos");
    setError(null);
    try {
      const added: UploadedPhoto[] = [];
      for (const file of [...files].slice(0, room)) {
        const key = await uploadPhoto(r.id, await toJpeg(file, r), () => undefined);
        added.push({ key, latitude: r.latitude, longitude: r.longitude, accuracyM: null, takenAt: new Date().toISOString() });
      }
      setBusy(null);
      await save(r, r.form, [...keptPhotos(r), ...added], "photos");
    } catch (e) {
      setError(errorText(e, "The photo could not be added."));
      setBusy(null);
    } finally {
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  /** Photos (WhatsApp / Viber reports) and videos (any report), uploaded one by one straight to storage. */
  const addMedia = async (r: AdminReport, files: FileList | null) => {
    if (!files?.length) return;
    setBusy("media");
    setError(null);
    const picked = [...files];
    const skipped: string[] = [];
    const controller = new AbortController();
    try {
      for (const [i, file] of picked.entries()) {
        const step = picked.length > 1 ? `${i + 1}/${picked.length} · ` : "";
        const report = (f: number) => setProgress(`${step}${Math.round(f * 100)}%`);
        report(0);
        if (file.type.startsWith("image/") && r.kind === "bridge") {
          await uploadReportMedia(r.id, await toJpeg(file, null), "photo.jpg", report, controller.signal);
        } else if (file.type.startsWith("video/") || videoName(file)) {
          const name = videoName(file);
          if (!name) {
            skipped.push(file.name);
            continue;
          }
          await uploadReportMedia(r.id, file, name, report, controller.signal);
        } else {
          skipped.push(file.name);
        }
      }
      await refresh();
      if (skipped.length) setError(`Not added (not a photo or a MP4, MOV, WebM or 3GP video): ${skipped.join(", ")}`);
    } catch (e) {
      setError(errorText(e, "The file could not be added."));
      void refresh();
    } finally {
      setBusy(null);
      setProgress(null);
      if (mediaInput.current) mediaInput.current.value = "";
    }
  };

  const removeMedia = async (r: AdminReport, key: string) => {
    setBusy("media");
    setError(null);
    setConfirm(null);
    try {
      await adminApi(`/api/admin/mobile-reports/${r.id}/media?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError(errorText(e, "The file could not be deleted."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r: AdminReport) => {
    setBusy("delete");
    setError(null);
    try {
      await adminApi(`/api/admin/mobile-reports/${r.id}`, { method: "DELETE" });
      queryClient.setQueryData<AdminReport[]>(listKey(days), (old) => (old ? old.filter((x) => x.id !== r.id) : old));
      setOpenId(null);
      setConfirm(null);
      void refresh();
    } catch (e) {
      setError(errorText(e, "The report could not be deleted."));
    } finally {
      setBusy(null);
    }
  };

  const mediaTile = (
    <button
      type="button"
      disabled={busy !== null}
      onClick={() => mediaInput.current?.click()}
      className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border px-2 text-center text-caption font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
    >
      {busy === "media" ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <Film className="size-6" aria-hidden />}
      {busy === "media" && progress ? `Uploading ${progress}` : open?.kind === "bridge" ? "Add photos or videos" : "Add videos"}
    </button>
  );

  return (
    <div className="space-y-4">
      <AdminCard bodyClassName="space-y-3">
        <p className="text-caption text-muted-foreground">
          Flood reports from the OKB mobile page and from the WhatsApp / Viber flood monitoring groups. Add or remove photos and videos,
          correct mobile reports, or delete a report (test, spam, duplicate). Changes show on the public map and in the Command Center
          right away.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={days} options={PERIODS} onChange={setDays} label="Period" />
          <Segmented value={source} options={SOURCES} onChange={setSource} label="Source" />
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Search reports</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search place, sender, group, text, RPT-…"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </AdminCard>

      {list.isError ? (
        <Notice tone="danger" title="Reports could not be loaded">
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
            {q ? "No report matches the search." : source === "all" ? "No flood reports in this period." : `No ${SOURCES.find((s) => s.value === source)?.label} reports in this period.`}
          </p>
        </AdminCard>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {reports.map((r) => (
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
                <Thumb photos={r.photos} videos={r.videos} source={sourceOf(r)} />
                {r.kind === "mobile" ? <MobileRow r={r} /> : <BridgeRow r={r} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <AdminSheet
        open={Boolean(open) && !editing}
        onClose={() => setOpenId(null)}
        title={open ? titleOf(open) : "Report"}
        description={
          open
            ? open.kind === "mobile"
              ? `${open.reference} · ${open.senderName ?? "Anonymous"}${open.contactNumber ? ` · ${open.contactNumber}` : ""}`
              : `${open.reference} · ${SOURCE_LABEL[open.source]}${open.groupName ? ` · ${open.groupName}` : ""}`
            : undefined
        }
        wide
        footer={
          open ? (
            confirm === "report" ? (
              <>
                <span className="mr-auto text-caption text-foreground">
                  {open.kind === "mobile" ? "Delete this report and its photos for good?" : "Delete this report for good (also from the OKB Bridge)?"}
                </span>
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
                {open.kind === "mobile" ? (
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
                ) : null}
              </>
            )
          ) : null
        }
      >
        {open ? (
          <div className="space-y-4">
            {open.kind === "mobile" ? <MobileFacts r={open} /> : <BridgeFacts r={open} />}

            {open.kind === "mobile" ? (
              <section className="space-y-2">
                <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  Photos ({open.photos.length}/{MAX_PHOTOS})
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {open.photos.map((p, i) => (
                    <MediaTile
                      key={p.key}
                      url={p.url}
                      label={`Photo ${i + 1}`}
                      confirming={confirm === p.key}
                      disabled={busy !== null || open.photos.length <= 1}
                      title={open.photos.length <= 1 ? "A report needs at least one photo. Delete the report instead." : "Delete photo"}
                      onAsk={() => setConfirm(p.key)}
                      onKeep={() => setConfirm(null)}
                      onDelete={() => {
                        setConfirm(null);
                        void save(open, open.form, keptPhotos(open).filter((x) => x.key !== p.key), "photos");
                      }}
                    />
                  ))}
                  {open.photos.length < MAX_PHOTOS ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => photoInput.current?.click()}
                      className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-caption font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
                    >
                      {busy === "photos" ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
                      Add photos
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                {open.kind === "mobile"
                  ? `Videos (${open.videos.length})`
                  : `Photos and videos (${open.photos.length + open.videos.length})`}
              </h3>
              {open.kind === "bridge" && !open.photos.length && !open.videos.length ? (
                <p className="text-caption text-muted-foreground">No photos uploaded. The public map says so until you add some.</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(open.kind === "bridge" ? open.photos : []).map((p, i) => (
                  <MediaTile
                    key={p.key}
                    url={p.url}
                    label={`Photo ${i + 1}`}
                    confirming={confirm === p.key}
                    disabled={busy !== null}
                    title="Delete photo"
                    onAsk={() => setConfirm(p.key)}
                    onKeep={() => setConfirm(null)}
                    onDelete={() => void removeMedia(open, p.key)}
                  />
                ))}
                {open.videos.map((v, i) => (
                  <MediaTile
                    key={v.key}
                    url={v.url}
                    video
                    label={`Video ${i + 1}`}
                    confirming={confirm === v.key}
                    disabled={busy !== null}
                    title="Delete video"
                    onAsk={() => setConfirm(v.key)}
                    onKeep={() => setConfirm(null)}
                    onDelete={() => void removeMedia(open, v.key)}
                  />
                ))}
                {mediaTile}
              </div>
              <p className="text-caption text-muted-foreground">
                {open.kind === "bridge" ? "Photos and videos" : "Videos"} show on the public OKB Mobile map and in the Incidents tab. Videos up to
                500 MB (MP4, MOV, WebM, 3GP).
              </p>
            </section>

            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => open.kind === "mobile" && void addPhotos(open, e.target.files)}
            />
            <input
              ref={mediaInput}
              type="file"
              accept={open.kind === "bridge" ? "image/*,video/*" : "video/*"}
              multiple
              className="hidden"
              onChange={(e) => void addMedia(open, e.target.files)}
            />
            {error ? <p className="rounded-lg bg-danger/10 p-3 text-caption font-medium text-danger">{error}</p> : null}
          </div>
        ) : null}
      </AdminSheet>

      {editing && open?.kind === "mobile" ? (
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

/** List thumbnail: the first photo (else the first video's frame, else a message icon) and the media count. */
function Thumb({ photos, videos, source }: { photos: ReportPhoto[]; videos: ReportVideo[]; source: ReportSource }) {
  const count = photos.length + videos.length;
  return (
    <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
      {photos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own route
        <img src={photos[0].url} alt="" loading="lazy" className="size-full object-cover" />
      ) : videos[0] ? (
        <video src={`${videos[0].url}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
      ) : (
        <MessageSquareText className="size-7 text-muted-foreground" aria-hidden />
      )}
      {source !== "okb_mobile" ? (
        <span
          className="absolute left-1 top-1 rounded px-1 text-[10px] font-bold text-white"
          style={{ background: SOURCE_COLOR[source] }}
        >
          {SOURCE_LABEL[source]}
        </span>
      ) : null}
      <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
        {videos.length ? <Film className="size-3" aria-hidden /> : <Camera className="size-3" aria-hidden />}
        {count}
      </span>
    </span>
  );
}

function MobileRow({ r }: { r: AdminMobileReport }) {
  const state = myReportState(r);
  return (
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
        {r.inConsolidated ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">In WhatsApp report</span> : null}
      </span>
    </span>
  );
}

function BridgeRow({ r }: { r: AdminBridgeReport }) {
  const onMap = r.locations.some((l) => l.onMap);
  return (
    <span className="min-w-0 flex-1 space-y-0.5">
      <span className="block truncate font-semibold text-foreground">{titleOf(r)}</span>
      <span className="line-clamp-2 text-caption text-muted-foreground">{r.text ?? r.summary ?? "No message text"}</span>
      <span className="block truncate text-caption text-muted-foreground">
        {r.groupName ?? SOURCE_LABEL[r.source]} · {formatDistanceToNowStrict(new Date(r.reportedAt), { addSuffix: true })}
      </span>
      <span className="flex flex-wrap gap-1 pt-0.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", onMap ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground")}>
          {onMap ? "Flooded on the map" : r.locations.length ? "Off the map" : "No flooded location"}
        </span>
        {r.status === "needs_review" ? (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">Needs review</span>
        ) : null}
        {!r.photos.length && !r.videos.length ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">No photos</span>
        ) : null}
      </span>
    </span>
  );
}

function Facts({ rows }: { rows: [string, string | null][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-caption sm:grid-cols-2">
      {rows
        .filter((row): row is [string, string] => Boolean(row[1]))
        .map(([k, v]) => (
          <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-words text-foreground">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function MobileFacts({ r }: { r: AdminMobileReport }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        <span className={cn("rounded-full px-2 py-0.5", myReportState(r).tone)}>{myReportState(r).label}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Status: {r.status.replaceAll("_", " ")}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          {r.hasEditKey ? "Sender can still edit" : "Sender cannot edit (sent before edit keys)"}
        </span>
        {r.inConsolidated ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">In WhatsApp report</span> : null}
      </div>
      <Facts
        rows={[
          ["Flood height", r.levelLabel ? `${r.levelLabel}${r.depthM !== null ? ` (${Math.round(r.depthM * 100)} cm)` : ""}` : null],
          ["Road", r.roadStatus],
          [r.stretch ? "Flooded stretch" : "Photo locations", r.placement],
          ["DEO", r.deo ?? "Not given"],
          ["Weather", r.weather],
          ["Started", r.startedAt ? manila(r.startedAt) : null],
          ["Receded", r.recededAt ? manila(r.recededAt) : "Not reported"],
          ["Sent", manila(r.reportedAt)],
          ["Landmark", r.landmark],
          ["Area", r.area],
          ["Remarks", r.remarks],
          ["Last edit", r.operatorEditedBy ? `by operator ${r.operatorEditedBy}` : r.editedAt ? "by the sender" : null],
        ]}
      />
      <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <MapPin className="size-4 shrink-0" aria-hidden />
        {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
      </p>
    </>
  );
}

function BridgeFacts({ r }: { r: AdminBridgeReport }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        <span className="rounded-full px-2 py-0.5 text-white" style={{ background: SOURCE_COLOR[r.source] }}>
          {SOURCE_LABEL[r.source]}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Status: {r.status.replaceAll("_", " ")}</span>
      </div>
      <Facts
        rows={[
          ["Sent", manila(r.reportedAt)],
          ["Group", r.groupName],
          ["Sender", r.senderName],
        ]}
      />
      <div className="rounded-xl bg-muted/50 p-3">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Message</p>
        <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-line break-words text-body text-foreground">{r.text ?? "No message text"}</p>
      </div>
      {r.locations.length ? (
        <ul className="space-y-1">
          {r.locations.map((l, i) => (
            <li key={`${l.label}-${i}`} className="flex items-start gap-2 text-caption">
              <MapPin className={cn("mt-0.5 size-4 shrink-0", l.onMap ? "text-danger" : "text-muted-foreground")} aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold text-foreground">{l.label}</span>
                <span className="text-muted-foreground">
                  {[l.levelLabel, l.depthM !== null ? `${Math.round(l.depthM * 100)} cm` : null, l.roadStatus, l.onMap ? "on the map now" : "off the map"]
                    .filter(Boolean)
                    .map((v) => ` · ${v}`)
                    .join("")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-muted-foreground">No flooded location in this report, so it has no pin on the map.</p>
      )}
    </>
  );
}

/** One photo or video with its delete button (asks first). */
function MediaTile({
  url,
  label,
  video = false,
  confirming,
  disabled,
  title,
  onAsk,
  onKeep,
  onDelete,
}: {
  url: string;
  label: string;
  video?: boolean;
  confirming: boolean;
  disabled: boolean;
  title: string;
  onAsk: () => void;
  onKeep: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border">
      <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label.toLowerCase()}`} className="relative block">
        {video ? (
          <>
            <video src={`${url}#t=0.1`} preload="metadata" muted playsInline className="aspect-[4/3] w-full bg-black object-cover" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-11 place-items-center rounded-full bg-black/60 text-white">
                <Play className="size-5 translate-x-0.5" aria-hidden />
              </span>
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own route
          <img src={url} alt={label} className="aspect-[4/3] w-full object-cover" />
        )}
      </a>
      {confirming ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-2">
          <p className="text-caption font-semibold text-white">Delete this {video ? "video" : "photo"}?</p>
          <div className="flex gap-2">
            <button type="button" onClick={onKeep} className="h-10 rounded-lg bg-white px-3 text-caption font-semibold text-slate-900">
              Keep
            </button>
            <button type="button" onClick={onDelete} className="h-10 rounded-lg bg-red-600 px-3 text-caption font-bold text-white">
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onAsk}
          aria-label={`Delete ${label.toLowerCase()}`}
          title={title}
          className="absolute right-1.5 top-1.5 flex size-10 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-40"
        >
          <X className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
