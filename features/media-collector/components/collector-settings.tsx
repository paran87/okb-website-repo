"use client";

import type { ReactNode } from "react";
import { Pause, Play, ServerCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCollectorStatus,
  useSetPaused,
} from "@/features/media-collector/hooks";
import type {
  CollectorPlatformSnapshot,
  CollectorStatus,
} from "@/features/media-collector/types";
import { ReportsGate } from "@/features/reports/components/reports-gate";
import { formatRelative } from "@/features/reports/lib/format";

/** A collector that has not reported for this long is shown as offline. */
const STALE_MS = 3 * 60_000;

const STATE: Record<string, { label: string; variant: BadgeVariant }> = {
  connected: { label: "Connected", variant: "success" },
  configured: { label: "Configured", variant: "info" },
  disabled: { label: "Disabled", variant: "default" },
  paused: { label: "Paused", variant: "warning" },
  unknown: { label: "Not checked yet", variant: "default" },
  auth_error: { label: "Credentials rejected", variant: "danger" },
  unreachable: { label: "Unreachable", variant: "danger" },
  error: { label: "Error", variant: "danger" },
  not_configured: { label: "Not configured", variant: "warning" },
  unsupported: { label: "Unsupported", variant: "default" },
  limited: { label: "API-created groups only", variant: "info" },
};

function StateBadge({ value }: { value: string }) {
  const s = STATE[value] ?? {
    label: value.replace(/_/g, " "),
    variant: "default" as BadgeVariant,
  };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border flex flex-col gap-1 border-t py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-caption text-foreground font-semibold">
        {label}
      </span>
      <div className="text-caption text-muted-foreground flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        {children}
      </div>
    </div>
  );
}

function PlatformRow({
  name,
  snap,
  paused,
  onToggle,
  busy,
}: {
  name: "WhatsApp" | "Viber";
  snap: CollectorPlatformSnapshot | null;
  paused: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  const status = paused ? "paused" : (snap?.status ?? "unknown");
  return (
    <div className="border-border space-y-2 border-t py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-foreground font-semibold">
            {name}
          </span>
          <StateBadge value={status} />
          {snap ? (
            <span className="text-muted-foreground text-[11px]">
              official API
            </span>
          ) : null}
        </div>
        <Button
          variant={paused ? "primary" : "outline"}
          isLoading={busy}
          onClick={onToggle}
          leftIcon={
            paused ? (
              <Play className="size-4" aria-hidden />
            ) : (
              <Pause className="size-4" aria-hidden />
            )
          }
        >
          {paused ? "Resume" : "Pause"}
        </Button>
      </div>
      {snap ? (
        <ul className="text-muted-foreground space-y-0.5 text-[11px]">
          {snap.detail ? <li>{snap.detail}</li> : null}
          <li>
            Allowed: {snap.allowlist.groups}{" "}
            {snap.allowlist.groups === 1 ? "group" : "groups"} ·{" "}
            {snap.allowlist.senders} direct{" "}
            {snap.allowlist.senders === 1 ? "sender" : "senders"}
          </li>
          <li>
            Groups: <StateBadge value={snap.groupCapture.status} />{" "}
            <code className="font-mono break-all">
              {snap.groupCapture.code}
            </code>
          </li>
          {snap.lastWebhookAt ? (
            <li>Last message: {formatRelative(snap.lastWebhookAt)}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function StatusCard({ status }: { status: CollectorStatus }) {
  const setPaused = useSetPaused();
  const toast = useToast();
  const latest =
    [...status.collectors].sort((a, b) =>
      a.reportedAt < b.reportedAt ? 1 : -1,
    )[0] ?? null;
  const stale =
    !latest || Date.now() - Date.parse(latest.reportedAt) > STALE_MS;
  const snap = latest?.snapshot ?? null;
  const overall: { label: string; variant: BadgeVariant } = !latest
    ? { label: "Never connected", variant: "default" }
    : stale
      ? { label: "Offline", variant: "danger" }
      : snap?.status === "ok"
        ? { label: "Online", variant: "success" }
        : { label: "Degraded", variant: "warning" };

  const toggle = (key: "whatsappPaused" | "viberPaused") => {
    const next = !status.settings[key];
    setPaused.mutate(
      { [key]: next },
      {
        onSuccess: () =>
          toast.success(
            next ? "Paused. The collector stops within a minute." : "Resumed.",
          ),
        onError: (err) =>
          toast.error({ title: "Not changed", description: err.message }),
      },
    );
  };
  const busyKey = setPaused.isPending
    ? Object.keys(setPaused.variables ?? {})[0]
    : null;

  return (
    <Card>
      <CardContent className="space-y-1 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <ServerCog className="text-primary size-5" aria-hidden />
          <h2 className="text-subheading text-foreground">
            OKB Media Collector
          </h2>
          <Badge variant={overall.variant} dot>
            {overall.label}
          </Badge>
        </div>
        <p className="text-caption text-muted-foreground pb-2">
          {latest
            ? `Last report ${formatRelative(latest.reportedAt)}${snap ? ` · v${snap.version}` : ""}. `
            : "No collector has reported yet. "}
          Which groups and senders are collected is set on the collector itself;
          credentials are never shown here. Pausing stops collection only.
        </p>
        <PlatformRow
          name="WhatsApp"
          snap={snap?.whatsapp ?? null}
          paused={status.settings.whatsappPaused}
          onToggle={() => toggle("whatsappPaused")}
          busy={busyKey === "whatsappPaused"}
        />
        <PlatformRow
          name="Viber"
          snap={snap?.viber ?? null}
          paused={status.settings.viberPaused}
          onToggle={() => toggle("viberPaused")}
          busy={busyKey === "viberPaused"}
        />
        {snap ? (
          <>
            <Row label="R2 storage">
              <StateBadge value={snap.r2.status} />
              {snap.r2.lastUploadAt ? (
                <span>last upload {formatRelative(snap.r2.lastUploadAt)}</span>
              ) : null}
            </Row>
            <Row label="Backend connection">
              <StateBadge value={snap.okbBackend.status} />
            </Row>
            <Row label="Queue">
              <span>
                {snap.queue.pending} pending · {snap.queue.failed} failed
              </span>
            </Row>
            <Row label="Maximum media size">
              <span>
                Images {snap.limits.maxImageMb} MB · Documents{" "}
                {snap.limits.maxDocumentMb} MB · Videos {snap.limits.maxVideoMb}{" "}
                MB
              </span>
            </Row>
          </>
        ) : null}
        {status.settings.updatedBy ? (
          <p className="text-muted-foreground pt-2 text-[11px]">
            Pause settings last changed by {status.settings.updatedBy}{" "}
            {formatRelative(status.settings.updatedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CollectorStatusSection() {
  const status = useCollectorStatus();
  if (status.isPending) return <Skeleton className="h-64 w-full" />;
  if (status.isError) {
    return (
      <Card>
        <ErrorState
          title="Media collector status unavailable"
          description={status.error.message}
          onRetry={() => status.refetch()}
        />
      </Card>
    );
  }
  if (!status.data.available) {
    return (
      <Card>
        <CardContent className="text-caption text-muted-foreground p-4 sm:p-6">
          <p className="text-subheading text-foreground pb-1">
            OKB Media Collector
          </p>
          {status.data.unavailableReason ?? "Not set up."}
        </CardContent>
      </Card>
    );
  }
  return <StatusCard status={status.data} />;
}

/** Settings → OKB Media Collector (operator access key required, like the automated reports). */
export function CollectorSettings() {
  return (
    <ReportsGate area="settings" bare>
      {() => <CollectorStatusSection />}
    </ReportsGate>
  );
}
