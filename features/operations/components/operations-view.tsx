"use client";

import { useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import {
  CheckSquare,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  KeyRound,
  MapPin,
  PlayCircle,
  PlugZap,
  Square,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import {
  OPERATIONS_SECTIONS,
  operationsSection,
  type OperationsMediaKind,
  type OperationsSectionId,
} from "@/features/operations/config";
import {
  OperationsApiError,
  useDeleteOperationsMedia,
  useOperationsMedia,
} from "@/features/operations/hooks/use-operations-media";
import type { OperationsMediaItem } from "@/features/operations/types";
import { ReportsApiError, useGrantAccess } from "@/features/reports/hooks/use-reports";

/** Cards rendered at a time; more are added with "Show more". */
const PAGE_SIZE = 60;

const KINDS: { id: OperationsMediaKind; label: string; icon: typeof ImageIcon }[] = [
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Video },
];

function uploadedAt(item: OperationsMediaItem): string {
  const date = new Date(item.lastModified);
  return Number.isNaN(date.getTime()) ? "" : format(date, "MMM d, yyyy · h:mm a");
}

function mapsUrl(item: OperationsMediaItem): string | null {
  return item.geotag ? `https://www.google.com/maps?q=${item.geotag.lat},${item.geotag.lng}` : null;
}

/** Operator name + access key, asked for the first time media is deleted. */
function AccessDialog({ open, onClose, onGranted }: { open: boolean; onClose: () => void; onGranted: () => void }) {
  const grant = useGrantAccess();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const error =
    grant.error instanceof ReportsApiError ? grant.error.message : grant.error ? "Access could not be granted." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    grant.mutate(
      { accessKey: key, operatorName: name.trim() },
      {
        onSuccess: () => {
          setKey("");
          onGranted();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Operator access" description="Deleting media needs the operator access key.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Operator name" htmlFor="ops-operator" required>
          <Input
            id="ops-operator"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            leftIcon={<UserRound className="size-4" aria-hidden />}
          />
        </Field>
        <Field label="Access key" htmlFor="ops-access-key" required error={error ?? undefined}>
          <Input
            id="ops-access-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="current-password"
            invalid={Boolean(error)}
            leftIcon={<KeyRound className="size-4" aria-hidden />}
          />
        </Field>
        <Button
          type="submit"
          className="w-full justify-center"
          isLoading={grant.isPending}
          disabled={name.trim().length < 2 || !key}
        >
          Continue
        </Button>
      </form>
    </Modal>
  );
}

function MediaCard({
  item,
  selecting,
  selected,
  onOpen,
  onToggle,
  onDelete,
}: {
  item: OperationsMediaItem;
  selecting: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn("relative overflow-hidden", selected && "ring-2 ring-primary")}>
      <button
        type="button"
        onClick={selecting ? onToggle : onOpen}
        aria-label={selecting ? `Select ${item.name}` : `Open ${item.name}`}
        aria-pressed={selecting ? selected : undefined}
        className="relative block aspect-square w-full bg-muted"
      >
        {item.kind === "photo" ? (
          // Signed R2 links: shown as-is (the image optimizer would need every link allow-listed).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.name} loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <>
            <video
              src={`${item.url}#t=0.5`}
              preload="metadata"
              muted
              playsInline
              className="pointer-events-none size-full object-cover"
            />
            <PlayCircle className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" aria-hidden />
          </>
        )}
        {selecting ? (
          <span className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-md bg-black/55 text-white">
            {selected ? <CheckSquare className="size-5" aria-hidden /> : <Square className="size-5" aria-hidden />}
          </span>
        ) : null}
      </button>
      {!selecting ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item.name}`}
          className="absolute right-1.5 top-1.5 flex size-10 items-center justify-center rounded-lg bg-black/55 text-white transition-colors hover:bg-danger"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="space-y-0.5 px-2.5 py-2">
        <p className="truncate text-[11px] text-muted-foreground">{uploadedAt(item)}</p>
        {item.geotag ? (
          <p className="flex items-center gap-1 truncate text-[11px] font-medium text-primary">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {item.geotag.lat.toFixed(5)}, {item.geotag.lng.toFixed(5)}
          </p>
        ) : item.note ? (
          <p className="truncate text-[11px] text-foreground">{item.note}</p>
        ) : null}
      </div>
    </Card>
  );
}

function MediaViewer({
  item,
  onClose,
  onDelete,
}: {
  item: OperationsMediaItem | null;
  onClose: () => void;
  onDelete: (item: OperationsMediaItem) => void;
}) {
  const map = item ? mapsUrl(item) : null;
  return (
    <Modal open={item !== null} onClose={onClose} size="xl">
      {item ? (
        <div className="-mx-5 -my-4 flex max-h-[90dvh] flex-col overflow-hidden rounded-card">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="min-w-0 truncate text-caption text-muted-foreground">{item.name}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
            {item.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.name} className="max-h-[65dvh] w-auto max-w-full object-contain" />
            ) : (
              <video src={item.url} controls autoPlay playsInline className="max-h-[65dvh] w-auto max-w-full">
                <track kind="captions" />
              </video>
            )}
          </div>
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5 text-caption">
              <p className="text-muted-foreground">Uploaded {uploadedAt(item)}</p>
              {item.geotag ? (
                <p className="flex items-center gap-1 font-medium text-foreground">
                  <MapPin className="size-3.5 text-primary" aria-hidden />
                  {item.geotag.lat.toFixed(6)}, {item.geotag.lng.toFixed(6)}
                </p>
              ) : null}
              {item.note ? <p className="text-foreground">{item.note}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {map ? (
                <a
                  href={map}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-body text-foreground hover:bg-muted/50"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Map
                </a>
              ) : null}
              <Button
                variant="danger"
                leftIcon={<Trash2 className="size-4" aria-hidden />}
                onClick={() => onDelete(item)}
                className={cn("justify-center", !map && "col-span-2")}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

function MediaGallery({ section, kind }: { section: OperationsSectionId; kind: OperationsMediaKind }) {
  const toast = useToast();
  const media = useOperationsMedia(section, kind);
  const remove = useDeleteOperationsMedia(section, kind);
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<OperationsMediaItem | null>(null);
  const [confirmKeys, setConfirmKeys] = useState<string[] | null>(null);
  const [accessKeys, setAccessKeys] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  const items = useMemo(() => {
    const list = media.data?.items ?? [];
    return order === "newest" ? list : [...list].reverse();
  }, [media.data, order]);
  const visible = items.slice(0, shown);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.key));

  const noun = kind === "photos" ? "photo" : "video";

  const runDelete = async (keys: string[]) => {
    setDeleting(true);
    let done = 0;
    try {
      for (const [i, key] of keys.entries()) {
        try {
          await remove.mutateAsync(key);
          done++;
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        } catch (err) {
          if (err instanceof OperationsApiError && err.status === 401 && err.reason === "access_required") {
            setAccessKeys(keys.slice(i));
          } else {
            toast.error({
              title: `Could not delete the ${noun}`,
              description: err instanceof Error ? err.message : undefined,
            });
          }
          break;
        }
      }
    } finally {
      setDeleting(false);
      setConfirmKeys(null);
    }
    if (done > 0) {
      toast.success(done === 1 ? `1 ${noun} deleted` : `${done} ${noun}s deleted`);
      setViewing((v) => (v && keys.includes(v.key) ? null : v));
      if (done === keys.length) setSelecting(false);
    }
  };

  if (!operationsSection(section).prefix) {
    return (
      <Card>
        <EmptyState
          icon={FolderOpen}
          title={`No ${kind} yet`}
          description="No storage folder is assigned to this section yet."
        />
      </Card>
    );
  }
  if (media.isPending) return <GallerySkeleton />;
  if (media.isError) {
    return (
      <Card>
        <ErrorState
          title={`Unable to load ${kind}`}
          description={media.error.message}
          onRetry={() => media.refetch()}
        />
      </Card>
    );
  }
  if (!media.data.configured) {
    return (
      <Card>
        <EmptyState
          icon={PlugZap}
          title="Media storage is not connected"
          description="Set OPERATIONS_R2_ACCOUNT_ID, OPERATIONS_R2_ACCESS_KEY_ID and OPERATIONS_R2_SECRET_ACCESS_KEY on the server to show the Cloudflare R2 media."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">
          {items.length} {items.length === 1 ? noun : `${noun}s`}
          {kind === "photos" ? " · geotagged only" : " · operations footage"}
        </p>
        {items.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as "newest" | "oldest")}
              aria-label="Sort order"
              className="h-10 rounded-lg border border-border bg-background px-2 text-caption text-foreground"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <Button
              variant={selecting ? "secondary" : "outline"}
              onClick={() => {
                setSelecting((s) => !s);
                setSelected(new Set());
              }}
            >
              {selecting ? "Cancel" : "Select"}
            </Button>
          </div>
        ) : null}
      </div>

      {selecting ? (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((i) => i.key)))}
            className="h-10 rounded-lg px-2 text-caption font-medium text-primary hover:bg-muted"
          >
            {allVisibleSelected ? "Clear all" : "Select all shown"}
          </button>
          <Button
            variant="danger"
            disabled={selected.size === 0}
            leftIcon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => setConfirmKeys([...selected])}
          >
            Delete {selected.size > 0 ? selected.size : ""}
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={kind === "photos" ? ImageIcon : Video}
            title={`No ${kind} to show`}
            description={
              kind === "photos"
                ? "Only geotagged photos from this folder are shown."
                : "Only videos showing declogging, clearing or cleaning work are shown."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <MediaCard
              key={item.key}
              item={item}
              selecting={selecting}
              selected={selected.has(item.key)}
              onOpen={() => setViewing(item)}
              onToggle={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.key)) next.delete(item.key);
                  else next.add(item.key);
                  return next;
                })
              }
              onDelete={() => setConfirmKeys([item.key])}
            />
          ))}
        </div>
      )}
      {items.length > visible.length ? (
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Show more
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Showing {visible.length} of {items.length}
          </p>
        </div>
      ) : null}

      <MediaViewer item={viewing} onClose={() => setViewing(null)} onDelete={(item) => setConfirmKeys([item.key])} />
      <ConfirmDialog
        open={confirmKeys !== null}
        title={confirmKeys && confirmKeys.length > 1 ? `Delete ${confirmKeys.length} ${noun}s?` : `Delete this ${noun}?`}
        description="It is removed from this gallery and moved to the bucket's _deleted folder."
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleting}
        onCancel={() => setConfirmKeys(null)}
        onConfirm={() => confirmKeys && void runDelete(confirmKeys)}
      />
      <AccessDialog
        open={accessKeys !== null}
        onClose={() => setAccessKeys(null)}
        onGranted={() => {
          const keys = accessKeys;
          setAccessKeys(null);
          if (keys) void runDelete(keys);
        }}
      />
    </div>
  );
}

export function OperationsView() {
  const [section, setSection] = useState<OperationsSectionId>("ncr-daily");
  const [kind, setKind] = useState<OperationsMediaKind>("photos");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Operations"
        description="Field photos and videos from the OKB WhatsApp bridge."
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.dashboard }, { label: "Operations" }]}
        compact
      />

      <div role="tablist" aria-label="Operation" className="grid grid-cols-2 gap-2">
        {OPERATIONS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "min-h-12 rounded-lg border px-3 py-2 text-left text-caption font-semibold leading-snug transition-colors sm:text-body",
              section === s.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div role="tablist" aria-label="Media type" className="flex gap-1 border-b border-border">
        {KINDS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            onClick={() => setKind(id)}
            className={cn(
              "-mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-button transition-colors",
              kind === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <MediaGallery key={`${section}-${kind}`} section={section} kind={kind} />
    </div>
  );
}
