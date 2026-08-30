"use client";

import { Bell } from "lucide-react";
import {
  AlertCard,
  NotificationList,
} from "@/features/dashboard/components/widgets/alert-card";
import { EquipmentCard } from "@/features/dashboard/components/widgets/equipment-card";
import { SystemHealthPanel } from "@/features/dashboard/components/widgets/system-health-panel";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import type {
  DashboardAlert,
  EquipmentSummary,
  SystemHealthItem,
} from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

interface RightOperationsPanelProps {
  equipment: EquipmentSummary;
  systemHealth: readonly SystemHealthItem[];
  notifications: readonly DashboardAlert[];
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

/** Right-side situational awareness widgets. */
export function RightOperationsPanel({
  equipment,
  systemHealth,
  notifications,
  className,
}: RightOperationsPanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain",
        className,
      )}
    >
      <EquipmentCard equipment={equipment} />
      <SystemHealthPanel items={systemHealth} />
      <WidgetContainer
        title="Notifications"
        subtitle={`${notifications.length} recent`}
        icon={<Bell className="size-4" aria-hidden />}
        bodyClassName="max-h-40 overflow-y-auto"
      >
        <NotificationList items={notifications} />
      </WidgetContainer>
    </div>
  );
}

export { AlertCard, EquipmentCard, SystemHealthPanel };
