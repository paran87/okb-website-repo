"use client";

import { AppIcons } from "@/lib/config/icons";
import { StatusIndicator, type StatusTone } from "@/components/ui/status-indicator";
import { cn } from "@/utils/cn";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "offline";

const QUALITY_TONE: Record<ConnectionQuality, StatusTone> = {
  excellent: "online",
  good: "online",
  fair: "warning",
  poor: "danger",
  offline: "offline",
};

const QUALITY_LABEL: Record<ConnectionQuality, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  offline: "Offline",
};

interface ConnectionIndicatorProps {
  quality?: ConnectionQuality;
  connected?: boolean;
  className?: string;
}

/** Header connection status indicator. */
export function ConnectionIndicator({
  quality = "good",
  connected = true,
  className,
}: ConnectionIndicatorProps) {
  const tone = connected ? QUALITY_TONE[quality] : "offline";
  const label = connected ? QUALITY_LABEL[quality] : "Disconnected";

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 lg:flex",
        className,
      )}
      title={`Connection: ${label}`}
    >
      {connected ? (
        <AppIcons.wifi className="size-3.5 text-success" aria-hidden />
      ) : (
        <AppIcons.wifiOff className="size-3.5 text-muted-foreground" aria-hidden />
      )}
      <StatusIndicator tone={tone} pulse={connected} label={label} />
    </div>
  );
}
