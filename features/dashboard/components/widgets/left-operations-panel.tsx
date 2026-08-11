"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Route,
  ShieldAlert,
  Waves,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { IncidentCard } from "@/features/dashboard/components/widgets/incident-card";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import type { OperationalListItem } from "@/features/dashboard/types";

interface LeftOperationsPanelProps {
  incidents: readonly OperationalListItem[];
  criticalAreas: readonly OperationalListItem[];
  fieldReports: readonly OperationalListItem[];
  roadClosures: readonly OperationalListItem[];
  className?: string;
}

/** Left-side operational lists with tabbed navigation. */
export function LeftOperationsPanel({
  incidents,
  criticalAreas,
  fieldReports,
  roadClosures,
  className,
}: LeftOperationsPanelProps) {
  return (
    <WidgetContainer
      title="Recent Activity"
      subtitle="Live operational feed"
      icon={<Waves className="size-4" aria-hidden />}
      className={className}
      noPadding
      bodyClassName="flex min-h-0 flex-1 flex-col px-2 pb-2"
    >
      <Tabs
        variant="pills"
        className="flex min-h-0 flex-1 flex-col"
        items={[
          {
            id: "incidents",
            label: "Incidents",
            content: (
              <ScrollList>
                {incidents.map((item) => (
                  <IncidentCard key={item.id} item={item} icon={Waves} />
                ))}
              </ScrollList>
            ),
          },
          {
            id: "critical",
            label: "Critical",
            content: (
              <ScrollList>
                {criticalAreas.map((item) => (
                  <IncidentCard key={item.id} item={item} icon={ShieldAlert} />
                ))}
              </ScrollList>
            ),
          },
          {
            id: "reports",
            label: "Reports",
            content: (
              <ScrollList>
                {fieldReports.map((item) => (
                  <IncidentCard key={item.id} item={item} icon={FileText} />
                ))}
              </ScrollList>
            ),
          },
          {
            id: "roads",
            label: "Roads",
            content: (
              <ScrollList>
                {roadClosures.map((item) => (
                  <IncidentCard key={item.id} item={item} icon={Route} />
                ))}
              </ScrollList>
            ),
          },
        ]}
      />
    </WidgetContainer>
  );
}

function ScrollList({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-[220px] space-y-0.5 overflow-y-auto lg:max-h-none lg:min-h-[200px] lg:flex-1">
      {children}
    </div>
  );
}
