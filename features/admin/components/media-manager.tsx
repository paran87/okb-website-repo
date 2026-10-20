"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AdminApiError, adminApi, jsonBody } from "@/features/admin/api";
import {
  detailsToForm,
  EMPTY_DETAILS,
  formToDetails,
  MediaDetailsFields,
  type DetailsForm,
} from "@/features/admin/components/media-details-form";
import { AdminSheet } from "@/features/admin/components/admin-sheet";
import { AdminCard, Notice, Segmented, SkeletonBlock } from "@/features/admin/components/admin-ui";
import { formatBytes, formatDate, formatTime } from "@/features/admin/format";
import {
  useCollections,
  useDeleteMedia,
  useEditMedia,
  useMedia,
  usePurgeMedia,
  useRestoreMedia,
} from "@/features/admin/hooks/use-admin";
import { uploadFile } from "@/features/admin/upload";
import type { AdminMediaItem, MediaCollection, MediaDetails } from "@/features/admin/types";
import { cn } from "@/utils/cn";

type KindFilter = "all" | "photo" | "video";
type View = "files" | "trash";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/3gpp,.m4v,.3gp";

// ------------------------------------------------------------------ uploads

interface UploadJob {
  id: string;
  file: File;
  collection: string;
  /** Title, caption, date, place and coordinates saved with the file once it is uploaded. */
  details?: MediaDetails;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  reason?: string | null;
  controller: AbortController;
}

function useUploadQueue(onDone: () => void) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const running = useRef(false);
  const queue = useRef<UploadJob[]>([]);

  const patch = useCallback((id: string, p: Partial<UploadJob>) => {
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...p } : j)));
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const job = queue.current.shift()!;
      if (job.controller.signal.aborted) continue;
      patch(job.id, { status: "uploading", progress: 0 });
      try {
        const key = await uploadFile(job.collection, job.file, (f) => patch(job.id, { progress: f }), job.controller.signal);
        if (job.details && Object.values(job.details).some((v) => v !== null && v !== undefined)) {
          try {
            await adminApi("/api/admin/media", {
              method: "PATCH",
              body: jsonBody({ collection: job.collection, key, ...job.details }),
              signal: job.controller.signal,
            });
          } catch (err) {
            // The file is safely uploaded; only its details were refused.
            patch(job.id, {
              status: "error",
              progress: 1,
              error: `Uploaded, but the details were not saved: ${err instanceof Error ? err.message : "unknown error"}. Use Edit to add them.`,
            });
            onDone();
            continue;
          }
        }
        patch(job.id, { status: "done", progress: 1 });
        onDone();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") continue;
        patch(job.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
          reason: err instanceof AdminApiError ? err.reason : null,
        });
      }
    }
    running.current = false;
  }, [onDone, patch]);

  const add = useCallback(
    (files: File[], collection: string, details?: MediaDetails) => {
      const next = files.map<UploadJob>((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        collection,
        details,
        progress: 0,
        status: "queued",
        controller: new AbortController(),
      }));
      queue.current.push(...next);
      setJobs((list) => [...next, ...list]);
      void pump();
    },
    [pump],
  );

  const retry = useCallback(
    (job: UploadJob) => {
      const fresh = { ...job, status: "queued" as const, progress: 0, error: undefined, controller: new AbortController() };
      setJobs((list) => list.map((j) => (j.id === job.id ? fresh : j)));
      queue.current.push(fresh);
      void pump();
    },
    [pump],
  );

  const remove = useCallback((job: UploadJob) => {
    job.controller.abort();
    queue.current = queue.current.filter((j) => j.id !== job.id);
    setJobs((list) => list.filter((j) => j.id !== job.id));
  }, []);

  const clearDone = useCallback(() => setJobs((list) => list.filter((j) => j.status !== "done")), []);

  return { jobs, add, retry, remove, clearDone };
}

function UploadList({
  jobs,
  onRetry,
  onRemove,
  onClear,
}: {
  jobs: UploadJob[];
  onRetry: (job: UploadJob) => void;
  onRemove: (job: UploadJob) => void;
  onClear: () => void;
}) {
  if (!jobs.length) return null;
  const done = jobs.filter((j) => j.status === "done").length;
  return (
    <AdminCard
      title={`Uploads · ${done} of ${jobs.length} done`}
      icon={<UploadCloud className="size-4" aria-hidden />}
      action={
        done ? (
          <button type="button" onClick={onClear} className="h-9 rounded-lg px-2 text-caption font-semibold text-primary">
            Clear finished
          </button>
        ) : null
      }
      bodyClassName="p-2"
    >
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-lg px-2 py-2">
            <div className="flex items-center gap-2">
              {job.status === "done" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : job.status === "error" ? (
                <XCircle className="size-4 shrink-0 text-danger" aria-hidden />
              ) : (
                <Loader2 className={cn("size-4 shrink-0 text-primary", job.status === "uploading" && "animate-spin")} aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-caption text-foreground">{job.file.name}</span>
              <span className="shrink-0 text-[11px] leading-4 tabular-nums text-muted-foreground">
                {job.status === "uploading" ? `${Math.round(job.progress * 100)}%` : formatBytes(job.file.size)}
              </span>
              {job.status === "error" ? (
                <button
                  type="button"
                  onClick={() => onRetry(job)}
                  className="h-9 shrink-0 rounded-lg px-2 text-caption font-semibold text-primary"
                >
                  Retry
                </button>
              ) : null}
              {job.status !== "done" ? (
                <button
                  type="button"
                  onClick={() => onRemove(job)}
                  aria-label={`Cancel ${job.file.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
            {job.status === "uploading" || job.status === "queued" ? (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${job.progress * 100}%` }} />
              </div>
            ) : null}
            {job.error ? <p className="mt-1 pl-6 text-[11px] leading-4 text-danger">{job.error}</p> : null}
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}

// ------------------------------------------------------------------ media card & sheets

function MediaThumb({ item, className }: { item: AdminMediaItem; className?: string }) {
  return item.kind === "photo" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt={item.title ?? item.name} loading="lazy" decoding="async" className={cn("object-cover", className)} />
  ) : (
    <video src={`${item.url}#t=0.5`} preload="metadata" muted playsInline className={cn("object-cover", className)} />
  );
}

function MediaCard({
  item,
  view,
  onOpen,
  onEdit,
  onDelete,
  onRestore,
}: {
  item: AdminMediaItem;
  view: View;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button type="button" onClick={onOpen} className="relative block aspect-[4/3] w-full overflow-hidden bg-muted" aria-label={`Open ${item.name}`}>
        <MediaThumb item={item} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className="absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-black/60 px-2 text-[10px] font-semibold uppercase tracking-wide text-white">
          {item.kind === "photo" ? <ImageIcon className="size-3" aria-hidden /> : <Film className="size-3" aria-hidden />}
          {item.kind}
        </span>
        {item.kind === "video" ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="size-5 translate-x-0.5" aria-hidden />
            </span>
          </span>
        ) : null}
        {item.shownInCommandCenter === false ? (
          <span className="absolute bottom-2 left-2 inline-flex h-6 items-center gap-1 rounded-full bg-warning px-2 text-[10px] font-semibold text-black">
            <EyeOff className="size-3" aria-hidden /> Hidden in gallery
          </span>
        ) : null}
      </button>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <p className="truncate text-caption font-semibold text-foreground" title={item.name}>
          {item.title ?? item.name}
        </p>
        {item.caption ? <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{item.caption}</p> : null}
        {item.place || item.latitude != null ? (
          <p className="flex items-center gap-1 truncate text-[11px] leading-4 text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{item.place ?? `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}</span>
          </p>
        ) : null}
        <p className="mt-auto pt-1 text-[11px] leading-4 text-muted-foreground">
          {formatBytes(item.size)} · {formatDate(item.takenAt ?? item.lastModified)}
        </p>
      </div>
      <div className="grid grid-cols-2 border-t border-border">
        {view === "files" ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="flex h-11 items-center justify-center gap-1.5 text-caption font-semibold text-foreground hover:bg-muted"
            >
              <Pencil className="size-4" aria-hidden /> Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-11 items-center justify-center gap-1.5 border-l border-border text-caption font-semibold text-danger hover:bg-danger/10"
            >
              <Trash2 className="size-4" aria-hidden /> Delete
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onRestore}
              className="flex h-11 items-center justify-center gap-1.5 text-caption font-semibold text-success hover:bg-success/10"
            >
              <RotateCcw className="size-4" aria-hidden /> Restore
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-11 items-center justify-center gap-1.5 border-l border-border text-caption font-semibold text-danger hover:bg-danger/10"
            >
              <Trash2 className="size-4" aria-hidden /> Forever
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function stem(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

function EditSheet({
  item,
  collection,
  captionsAvailable,
  detailsAvailable,
  onClose,
}: {
  item: AdminMediaItem;
  collection: MediaCollection;
  captionsAvailable: boolean;
  detailsAvailable: boolean;
  onClose: () => void;
}) {
  const edit = useEditMedia();
  const toast = useToast();
  const [fileName, setFileName] = useState(stem(item.name));
  const [form, setForm] = useState<DetailsForm>(() => detailsToForm(item));
  const [formError, setFormError] = useState<string | null>(null);
  const ext = item.name.slice(stem(item.name).length);
  const withCoordinates = collection.area === "command";

  const save = () => {
    const parsed = formToDetails(form, withCoordinates);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }
    setFormError(null);
    const { details } = parsed;
    edit.mutate(
      {
        collection: collection.id,
        key: item.key,
        fileName: fileName.trim() !== stem(item.name) ? fileName.trim() : null,
        ...(detailsAvailable
          ? details
          : captionsAvailable
            ? { title: details.title, caption: details.caption }
            : {}),
      },
      {
        onSuccess: () => {
          toast.success("Changes saved");
          onClose();
        },
      },
    );
  };

  return (
    <AdminSheet
      open
      onClose={onClose}
      title="Edit file"
      description={collection.label}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-caption font-semibold text-muted-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={edit.isPending || !fileName.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-caption font-semibold text-primary-foreground disabled:opacity-60"
          >
            {edit.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl bg-muted">
          <MediaThumb item={item} className="max-h-56 w-full" />
        </div>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-foreground">File name</span>
          <div className="flex items-center gap-2">
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} maxLength={120} />
            <span className="shrink-0 font-mono text-caption text-muted-foreground">{ext}</span>
          </div>
        </label>
        {captionsAvailable ? (
          <>
            <MediaDetailsFields value={form} onChange={setForm} withCoordinates={withCoordinates} detailsAvailable={detailsAvailable} />
            {collection.area === "website" ? (
              <p className="text-[11px] leading-4 text-muted-foreground">The title, caption, date and place are shown on the public Gallery page.</p>
            ) : (
              <p className="text-[11px] leading-4 text-muted-foreground">These details are shown in the Command Center Operations gallery.</p>
            )}
          </>
        ) : (
          <p className="text-[11px] leading-4 text-muted-foreground">Titles and captions become available after the Setup step.</p>
        )}
        {formError ? <p className="text-caption text-danger">{formError}</p> : null}
        {edit.error ? <p className="text-caption text-danger">{edit.error.message}</p> : null}
      </div>
    </AdminSheet>
  );
}

/** Asks for the details of the files about to be uploaded; they are saved with every file of the batch. */
function UploadDetailsSheet({
  files,
  collection,
  detailsAvailable,
  onCancel,
  onUpload,
}: {
  files: File[];
  collection: MediaCollection;
  detailsAvailable: boolean;
  onCancel: () => void;
  onUpload: (details?: MediaDetails) => void;
}) {
  const [form, setForm] = useState<DetailsForm>(EMPTY_DETAILS);
  const [error, setError] = useState<string | null>(null);
  const withCoordinates = collection.area === "command";
  const submit = () => {
    const parsed = formToDetails(form, withCoordinates);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    onUpload(parsed.details);
  };
  return (
    <AdminSheet
      open
      onClose={onCancel}
      title={files.length === 1 ? "Add details and upload" : `Add details to ${files.length} files`}
      description={collection.label}
      footer={
        <>
          <button type="button" onClick={onCancel} className="h-10 rounded-lg px-4 text-caption font-semibold text-muted-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onUpload()}
            className="h-10 rounded-lg px-4 text-caption font-semibold text-foreground hover:bg-muted"
          >
            Skip details
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-caption font-semibold text-primary-foreground"
          >
            <UploadCloud className="size-4" aria-hidden /> Upload
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <ul className="max-h-24 space-y-0.5 overflow-y-auto rounded-lg bg-muted px-3 py-2 text-caption text-muted-foreground">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="truncate">
              {f.name} · {formatBytes(f.size)}
            </li>
          ))}
        </ul>
        {files.length > 1 ? (
          <p className="text-[11px] leading-4 text-muted-foreground">
            These details are saved with every file in this batch. Upload files that share a place and date together, or edit each file afterwards.
          </p>
        ) : null}
        <MediaDetailsFields value={form} onChange={setForm} withCoordinates={withCoordinates} detailsAvailable={detailsAvailable} />
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </div>
    </AdminSheet>
  );
}

function PreviewSheet({ item, onClose }: { item: AdminMediaItem; onClose: () => void }) {
  return (
    <AdminSheet open onClose={onClose} title={item.title ?? item.name} description={item.name} wide>
      <div className="space-y-3">
        <div className="flex justify-center overflow-hidden rounded-xl bg-black">
          {item.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.title ?? item.name} className="max-h-[65dvh] w-auto max-w-full object-contain" />
          ) : (
            <video src={item.url} controls playsInline autoPlay className="max-h-[65dvh] w-full" />
          )}
        </div>
        {item.caption ? <p className="text-body text-foreground">{item.caption}</p> : null}
        {item.place || item.latitude != null ? (
          <p className="flex items-center gap-1.5 text-caption text-foreground">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
            {item.place ?? ""}
            {item.latitude != null && item.longitude != null ? (
              <span className="font-mono text-muted-foreground">
                {item.place ? " · " : ""}
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </span>
            ) : null}
          </p>
        ) : null}
        <p className="text-caption text-muted-foreground">
          {formatBytes(item.size)}
          {item.takenAt ? ` · taken ${formatDate(item.takenAt)} ${formatTime(item.takenAt)}` : ""} · uploaded {formatDate(item.lastModified)}{" "}
          {formatTime(item.lastModified)}
        </p>
        {item.shownInCommandCenter === false ? (
          <p className="text-caption text-warning">
            Not shown in the Command Center gallery: older files there were reviewed by hand and this one was left out.
          </p>
        ) : null}
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-caption font-semibold text-foreground hover:bg-muted"
        >
          <Eye className="size-4" aria-hidden /> Open full size
        </a>
      </div>
    </AdminSheet>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AdminSheet
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-caption font-semibold text-muted-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-danger px-5 text-caption font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-body text-muted-foreground">{body}</p>
    </AdminSheet>
  );
}

// ------------------------------------------------------------------ view

export function MediaManager({ onOpenSetup }: { onOpenSetup: () => void }) {
  const collections = useCollections(true);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [view, setView] = useState<View>("files");
  const [kind, setKind] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<AdminMediaItem | null>(null);
  const [editing, setEditing] = useState<AdminMediaItem | null>(null);
  const [confirm, setConfirm] = useState<AdminMediaItem | null>(null);
  const [pending, setPending] = useState<File[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!collectionId && collections.data?.[0]) setCollectionId(collections.data[0].id);
  }, [collectionId, collections.data]);

  const collection = collections.data?.find((c) => c.id === collectionId) ?? null;
  const media = useMedia(collectionId, view);
  const del = useDeleteMedia();
  const restore = useRestoreMedia();
  const purge = usePurgeMedia();

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin", "media"] });
  }, [qc]);
  const uploads = useUploadQueue(refresh);

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (media.data?.items ?? []).filter(
      (i) =>
        (kind === "all" || i.kind === kind) &&
        (!term || `${i.name} ${i.title ?? ""} ${i.caption ?? ""}`.toLowerCase().includes(term)),
    );
  }, [media.data, kind, search]);

  const counts = useMemo(() => {
    const all = media.data?.items ?? [];
    return { photo: all.filter((i) => i.kind === "photo").length, video: all.filter((i) => i.kind === "video").length };
  }, [media.data]);

  const addFiles = (list: FileList | null) => {
    if (!list?.length || !collectionId) return;
    // Ask for the details first (title, caption, date, place, coordinates); they are saved with each file.
    setPending(Array.from(list));
    if (view !== "files") setView("files");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const runConfirm = () => {
    if (!confirm || !collectionId) return;
    const body = { collection: collectionId, key: confirm.key };
    const mutation = view === "trash" ? purge : del;
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success(view === "trash" ? "Deleted forever" : "Moved to trash");
        setConfirm(null);
      },
      onError: (err) => toast.error({ title: "Could not delete", description: err.message }),
    });
  };

  const runRestore = (item: AdminMediaItem) => {
    if (!collectionId) return;
    restore.mutate(
      { collection: collectionId, key: item.key },
      {
        onSuccess: () => toast.success("Restored"),
        onError: (err) => toast.error({ title: "Could not restore", description: err.message }),
      },
    );
  };

  const storageMissing = media.error instanceof AdminApiError && media.error.reason === "storage_not_configured";

  return (
    <div className="space-y-4" onDragOver={(e) => e.preventDefault()}>
      {/* Collections */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Collection">
        {(collections.data ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === collectionId}
            onClick={() => setCollectionId(c.id)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
              c.id === collectionId
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn("size-2.5 shrink-0 rounded-full", c.area === "website" ? "bg-orange-500" : "bg-primary")}
              aria-hidden
            />
            <span className="text-caption font-semibold">{c.label}</span>
          </button>
        ))}
      </div>
      {collection ? <p className="-mt-1 text-[11px] leading-4 text-muted-foreground">{collection.description}</p> : null}


      {/* Upload drop zone */}
      {view === "files" ? (
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "admin-dropzone flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:flex-row sm:text-left",
            dragging ? "border-primary bg-primary/10" : "border-border bg-card",
          )}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <UploadCloud className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-foreground">Upload photos and videos</p>
            <p className="text-caption text-muted-foreground">
              <span className="hidden sm:inline">Drop files here or choose them. </span>JPG, PNG, WebP, GIF, MP4, MOV, WebM · up to 1 GB each
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={!collectionId}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-caption font-semibold text-primary-foreground shadow-sm disabled:opacity-60 sm:w-auto"
          >
            <UploadCloud className="size-4" aria-hidden /> Choose files
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      <UploadList jobs={uploads.jobs} onRetry={uploads.retry} onRemove={uploads.remove} onClear={uploads.clearDone} />

      {/* Filters */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Segmented
          label="Files or trash"
          value={view}
          options={[
            { value: "files", label: "Files" },
            { value: "trash", label: "Trash" },
          ]}
          onChange={setView}
          className="md:w-auto"
        />
        <Segmented
          label="Type"
          value={kind}
          options={[
            { value: "all", label: "All" },
            { value: "photo", label: `Photos${media.data ? ` (${counts.photo})` : ""}` },
            { value: "video", label: `Videos${media.data ? ` (${counts.video})` : ""}` },
          ]}
          onChange={setKind}
          className="md:w-auto"
        />
        <div className="md:ml-auto md:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files"
            aria-label="Search files"
            leftIcon={<Search className="size-4" aria-hidden />}
          />
        </div>
      </div>

      {storageMissing ? (
        <Notice tone="danger" title="Media storage is not connected">
          Set the OPERATIONS_R2_* variables on the server (Cloudflare R2).
        </Notice>
      ) : media.error ? (
        <Notice
          tone="danger"
          title="Files could not be loaded"
          action={
            media.error instanceof AdminApiError && media.error.reason === "storage_error" ? (
              <button
                type="button"
                onClick={onOpenSetup}
                className="h-10 rounded-lg bg-danger px-4 text-caption font-semibold text-white"
              >
                Run storage check
              </button>
            ) : null
          }
        >
          {media.error.message}
        </Notice>
      ) : null}
      {view === "trash" && media.data ? (
        <p className="text-caption text-muted-foreground">
          Deleted files stay here until you restore them or delete them forever.
        </p>
      ) : null}

      {media.isLoading ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonBlock key={i} className="aspect-[3/4]" />
          ))}
        </ul>
      ) : media.data ? (
        items.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <MediaCard
                key={item.key}
                item={item}
                view={view}
                onOpen={() => setPreview(item)}
                onEdit={() => setEditing(item)}
                onDelete={() => setConfirm(item)}
                onRestore={() => runRestore(item)}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
            <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-body font-semibold text-foreground">
              {view === "trash" ? "Trash is empty" : search || kind !== "all" ? "No files match" : "No files yet"}
            </p>
            {view === "files" && !search && kind === "all" ? (
              <p className="text-caption text-muted-foreground">Upload the first photo or video above.</p>
            ) : null}
          </div>
        )
      ) : null}

      {pending && collection ? (
        <UploadDetailsSheet
          files={pending}
          collection={collection}
          detailsAvailable={media.data?.detailsAvailable ?? false}
          onCancel={() => setPending(null)}
          onUpload={(details) => {
            uploads.add(pending, collection.id, details);
            setPending(null);
          }}
        />
      ) : null}
      {preview ? <PreviewSheet item={preview} onClose={() => setPreview(null)} /> : null}
      {editing && collection ? (
        <EditSheet
          item={editing}
          collection={collection}
          captionsAvailable={media.data?.captionsAvailable ?? false}
          detailsAvailable={media.data?.detailsAvailable ?? false}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {confirm ? (
        <ConfirmSheet
          title={view === "trash" ? "Delete forever?" : "Move to trash?"}
          body={
            view === "trash"
              ? `"${confirm.name}" will be removed from storage. This cannot be undone.`
              : `"${confirm.name}" will disappear from ${collection?.area === "website" ? "the website" : "the Command Center"}. You can restore it from Trash.`
          }
          confirmLabel={view === "trash" ? "Delete forever" : "Move to trash"}
          busy={del.isPending || purge.isPending}
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
