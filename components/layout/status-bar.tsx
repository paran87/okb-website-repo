"use client";

import type { StatusTone } from "@/components/ui/status-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { cn } from "@/utils/cn";

interface ServiceStatus {
  id: string;
  label: string;
  tone: StatusTone;
  detail?: string;
}

const SERVICE_STATUSES: readonly ServiceStatus[] = [
  { id: "system", label: "System", tone: "online", detail: "Operational" },
  { id: "database", label: "Database", tone: "online" },
  { id: "api", label: "API", tone: "online" },
  { id: "weather", label: "Weather", tone: "warning", detail: "Standby" },
  { id: "map", label: "Map", tone: "online" },
  { id: "realtime", label: "Realtime", tone: "warning", detail: "Pending" },
  { id: "auth", label: "Auth", tone: "info", detail: "Not configured" },
];

interface StatusBarProps {
  className?: string;
}

/** Bottom operational status bar for service health and session context. */
export function StatusBar({ className }: StatusBarProps) {
  return (
    <footer
      role="contentinfo"
      aria-label="System status"
      // text-xs (12 px, as the service labels' text-caption): tailwind-merge would drop a custom text-* size here.
      className={cn(
        "flex h-8 shrink-0 items-center gap-3 overflow-x-auto border-t border-border bg-sidebar px-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-3">
        {SERVICE_STATUSES.map((service) => (
          <StatusIndicator
            key={service.id}
            tone={service.tone}
            pulse={service.tone === "online"}
            label={
              service.detail
                ? `${service.label}: ${service.detail}`
                : service.label
            }
            className="whitespace-nowrap"
          />
        ))}
      </div>

      {/* Phones: first, so it shows without scrolling the bar; the services follow. */}
      <div className="order-first flex shrink-0 items-center gap-3 whitespace-nowrap sm:order-none sm:ml-auto">
        <span>
          Connection: <span className="text-success">Good</span>
        </span>
        <span>
          Operator: <span className="text-foreground">JENER L. BRAGA</span>
        </span>
      </div>
    </footer>
  );
}
