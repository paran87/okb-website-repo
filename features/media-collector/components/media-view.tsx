"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Film,
  ImageIcon,
  ImageOff,
  MessageSquareText,
  PlugZap,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectedMedia } from "@/features/media-collector/hooks";
import type {
  CollectedMediaItem,
  MediaListQuery,
  MediaSource,
  MediaStatus,
} from "@/features/media-collector/types";
import { ReportsGate } from "@/features/reports/components/reports-gate";
import { formatDateTime } from "@/features/reports/lib/format";

const STATUS: Record<MediaStatus, { label: string; variant: BadgeVariant }> = {
  stored: { label: "Stored", variant: "success" },
  duplicate: { label: "Duplicate", variant: "info" },
  media_unavailable: { label: "Not provided", variant: "warning" },
  rejected: { label: "Rejected", variant: "danger" },
  not_collected: { label: "Not collected", variant: "default" },
  pending_upload: { label: "Uploading", variant: "default" },
  none: { label: "No file", variant: "default" },
};

const SOURCES: { id: MediaSource | ""; label: string }[] = [
  { id: "", label: "All" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "viber", label: "Viber" },
];

const KIND_LABEL: Record<string, string> = {
  image: "Image",
  video: "Video",
  document: "Document",
  audio: "Audio",
  sticker: "Sticker",
  other: "Other",
};

function typeLabel(item: CollectedMediaItem): string {
  const mime = item.mimeType ?? "";
  if (mime === "application/pdf") return "PDF";
  if (/wordprocessingml|msword/.test(mime)) return "Word";
  if (/spreadsheetml|ms-excel/.test(mime)) return "Excel";
  if (/presentationml|ms-powerpoint/.test(mime)) return "PowerPoint";
  if (mime === "text/plain") return "Text";
  return KIND_LABEL[item.kind ?? "other"] ?? "File";
}

function size(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Manila calendar date (YYYY-MM-DD) -> ISO instant at the start of that day (+08:00). */
const dayStart = (d: string) => (d ? `${d}T00:00:00+08:00` : undefined);
function dayEnd(d: string): string | undefined {
  if (!d) return undefined;
  const next = new Date(`${d}T00:00:00+08:00`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Filters({
  draft,
  setDraft,
  groups,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  groups: string[];
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const [open, setOpen] = useState(false);
  const active = [
    draft.kind,
    draft.status,
    draft.group,
    draft.sender.trim(),
    draft.from,
    draft.to,
  ].filter(Boolean).length;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div
          role="tablist"
          aria-label="Source"
          className="grid flex-1 grid-cols-3 gap-2 sm:inline-grid sm:flex-none"
        >
          {SOURCES.map((s) => (
            <button
              key={s.id || "all"}
              type="button"
              role="tab"
              aria-selected={draft.source === s.id}
              onClick={() => set({ source: s.id })}
              className={cn(
                "text-caption min-h-10 rounded-lg border px-3 font-semibold transition-colors sm:px-5",
                draft.source === s.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* Phones: the other filters fold away so the media is on the first screen. */}
        <Button
          variant={active ? "secondary" : "outline"}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="media-filters"
          leftIcon={<SlidersHorizontal className="size-4" aria-hidden />}
          className="shrink-0 px-3 sm:hidden"
        >
          {active ? `Filters (${active})` : "Filters"}
        </Button>
      </div>
      <div
        id="media-filters"
        className={cn(
          "grid-cols-2 items-end gap-2 sm:grid md:grid-cols-4 xl:grid-cols-7",
          open ? "grid" : "hidden",
        )}
      >
        <select
          aria-label="Media type"
          value={draft.kind}
          onChange={(e) => set({ kind: e.target.value as Draft["kind"] })}
          className={selectClass}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
        <select
          aria-label="Processing status"
          value={draft.status}
          onChange={(e) => set({ status: e.target.value as Draft["status"] })}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="stored">Stored</option>
          <option value="duplicate">Duplicate</option>
          <option value="media_unavailable">Not provided by platform</option>
          <option value="rejected">Rejected</option>
          <option value="not_collected">Not collected</option>
        </select>
        <select
          aria-label="Group"
          value={draft.group}
          onChange={(e) => set({ group: e.target.value })}
          className={cn(selectClass, "col-span-2 md:col-span-1 xl:col-span-2")}
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <div className="col-span-2 md:col-span-1">
          <Input
            aria-label="Sender"
            placeholder="Sender"
            value={draft.sender}
            onChange={(e) => set({ sender: e.target.value })}
            leftIcon={<Search className="size-4" aria-hidden />}
            maxLength={100}
          />
        </div>
        <label className="text-muted-foreground flex min-w-0 flex-col gap-0.5 text-[11px]">
          From
          <input
            type="date"
            value={draft.from}
            onChange={(e) => set({ from: e.target.value })}
            className={selectClass}
          />
        </label>
        <label className="text-muted-foreground flex min-w-0 flex-col gap-0.5 text-[11px]">
          To
          <input
            type="date"
            value={draft.to}
            onChange={(e) => set({ to: e.target.value })}
            className={selectClass}
          />
        </label>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  children,
  external,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-2 text-caption font-medium text-foreground transition-colors hover:bg-muted/60";
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {icon}
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {icon}
      {children}
    </Link>
  );
}

function Preview({ item }: { item: CollectedMediaItem }) {
  if (item.previewUrl) {
    return (
      // Signed R2 links: shown as-is (the image optimizer would need every link allow-listed).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.previewUrl}
        alt={`Photo from ${item.senderName ?? "reporter"}`}
        loading="lazy"
        className="size-full object-cover"
      />
    );
  }
  const Icon = !item.hasFile
    ? ImageOff
    : item.kind === "video"
      ? Film
      : item.kind === "image"
        ? ImageIcon
        : FileText;
  return (
    <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
      <Icon className="size-10" aria-hidden />
      <span className="text-caption line-clamp-2 break-all">
        {item.fileName ?? typeLabel(item)}
      </span>
    </div>
  );
}

function MediaCard({ item }: { item: CollectedMediaItem }) {
  const toast = useToast();
  const [showMessage, setShowMessage] = useState(false);
  const status = STATUS[item.status];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.reference);
      toast.success("Reference copied");
    } catch {
      toast.error({ title: "Could not copy", description: item.reference });
    }
  };
  const fileUrl = `/api/media-collector/${encodeURIComponent(item.fileRef ?? item.id)}/file`;
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="bg-muted relative aspect-video w-full sm:aspect-[4/3]">
        <Preview item={item} />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <Badge variant={status.variant} className="bg-card/90 shadow-sm">
            {status.label}
          </Badge>
          <Badge variant="outline" className="bg-card/90 shadow-sm">
            {item.source === "whatsapp" ? "WhatsApp" : "Viber"}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <dl className="text-caption grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt className="text-muted-foreground">Sender</dt>
          <dd className="text-foreground truncate font-medium">
            {item.senderName ?? "Unknown"}
          </dd>
          <dt className="text-muted-foreground">Group</dt>
          <dd className="text-foreground truncate">
            {item.conversationType === "direct"
              ? "Direct message"
              : (item.groupName ?? "Unnamed group")}
          </dd>
          <dt className="text-muted-foreground">Received</dt>
          <dd className="text-foreground truncate">
            {formatDateTime(item.receivedAt ?? item.createdAt)}
          </dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="text-foreground truncate">
            {typeLabel(item)}
            {size(item.fileSizeBytes) ? ` · ${size(item.fileSizeBytes)}` : ""}
          </dd>
        </dl>
        {item.statusReason && !item.hasFile ? (
          <p className="bg-muted text-muted-foreground flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px]">
            <ShieldAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            <span className="break-words">
              {item.statusReason.replace(/_/g, " ")}
            </span>
          </p>
        ) : null}
        {item.channel === "android_bridge" ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Smartphone className="size-3.5 shrink-0" aria-hidden />
            {item.status === "duplicate"
              ? "Android bridge · same file as an earlier message"
              : "Captured by the Android bridge"}
          </p>
        ) : null}
        {item.duplicateOfAndroidMessage ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Smartphone className="size-3.5 shrink-0" aria-hidden />
            Also received by the Android bridge (one report)
          </p>
        ) : null}
        {showMessage ? (
          <p className="border-border bg-background text-caption text-foreground rounded-md border px-2 py-1.5 break-words whitespace-pre-wrap">
            {item.messageText ?? "No text with this file."}
          </p>
        ) : null}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          {item.hasFile ? (
            <>
              <ActionLink
                href={fileUrl}
                external
                icon={<Eye className="size-4" aria-hidden />}
              >
                View
              </ActionLink>
              <ActionLink
                href={`${fileUrl}?download=1`}
                external
                icon={<Download className="size-4" aria-hidden />}
              >
                Download
              </ActionLink>
            </>
          ) : null}
          {item.reportId ? (
            <ActionLink
              href={`${ROUTES.reports}/${item.reportId}`}
              icon={<ExternalLink className="size-4" aria-hidden />}
            >
              Open report
            </ActionLink>
          ) : null}
          <Button
            variant="outline"
            onClick={() => setShowMessage((v) => !v)}
            leftIcon={<MessageSquareText className="size-4" aria-hidden />}
            className="text-caption justify-center px-2"
            aria-expanded={showMessage}
          >
            {showMessage ? "Hide message" : "Message"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => void copy()}
            leftIcon={<Copy className="size-4" aria-hidden />}
            className="text-caption justify-center px-2"
          >
            Copy ref
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface Draft {
  source: MediaSource | "";
  kind: "" | "image" | "video" | "document";
  status: "" | Exclude<MediaStatus, "none" | "pending_upload">;
  group: string;
  sender: string;
  from: string;
  to: string;
}

const EMPTY: Draft = {
  source: "",
  kind: "",
  status: "",
  group: "",
  sender: "",
  from: "",
  to: "",
};

function Gallery() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const query: MediaListQuery = useMemo(
    () => ({
      source: draft.source || undefined,
      kind: draft.kind || undefined,
      status: draft.status || undefined,
      group: draft.group || undefined,
      sender: draft.sender.trim().length >= 2 ? draft.sender.trim() : undefined,
      from: dayStart(draft.from),
      to: dayEnd(draft.to),
    }),
    [draft],
  );
  const media = useCollectedMedia(query);
  const pages = media.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const first = pages[0];
  const groups = first?.groups ?? [];

  let body: ReactNode;
  if (media.isPending) {
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    );
  } else if (media.isError) {
    body = (
      <Card>
        <ErrorState
          title="Unable to load media"
          description={media.error.message}
          onRetry={() => media.refetch()}
        />
      </Card>
    );
  } else if (first && !first.configured) {
    body = (
      <Card>
        <EmptyState
          icon={PlugZap}
          title="Media storage is not set up yet"
          description="Apply migrations/20261009_okb_media_collector.sql and migrations/20261010_okb_bridge_media_items.sql (okb-bridge-cloud-backend) in the OKB Bridge Supabase project."
        />
      </Card>
    );
  } else if (items.length === 0) {
    body = (
      <Card>
        <EmptyState
          icon={ImageIcon}
          title="No media"
          description="No file from an authorized WhatsApp or Viber channel matches these filters."
        />
      </Card>
    );
  } else {
    body = (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
        {media.hasNextPage ? (
          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              isLoading={media.isFetchingNextPage}
              onClick={() => void media.fetchNextPage()}
            >
              Show more
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <Filters draft={draft} setDraft={setDraft} groups={groups} />
      {first?.total !== null &&
      first?.total !== undefined &&
      !media.isPending ? (
        <p className="text-caption text-muted-foreground">
          {first.total} {first.total === 1 ? "file" : "files"} · authorized
          channels only
        </p>
      ) : null}
      {body}
    </div>
  );
}

export function MediaView() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="OKB Media"
        description="Photos and documents from authorized WhatsApp and Viber reporting channels (Android bridge and OKB Media Collector)."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "OKB Media" },
        ]}
        compact
      />
      <ReportsGate area="settings">{() => <Gallery />}</ReportsGate>
    </div>
  );
}
