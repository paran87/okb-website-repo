"use client";

import { Truck, Wrench } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import { AnimatedNumber } from "@/features/dashboard/components/widgets/animated-number";
import type { EquipmentSummary } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

interface EquipmentCardProps {
  equipment: EquipmentSummary;
  className?: string;
}

/** Equipment availability and deployment summary. */
export function EquipmentCard({ equipment, className }: EquipmentCardProps) {
  return (
    <WidgetContainer
      title="Equipment Status"
      subtitle={`${equipment.utilizationPercent}% utilization`}
      icon={<Truck className="size-4" aria-hidden />}
      className={className}
      bodyClassName="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Available" value={equipment.available} tone="success" />
        <Stat label="Deployed" value={equipment.deployed} tone="primary" />
        <Stat
          label="Maintenance"
          value={equipment.maintenance}
          tone="warning"
          icon={Wrench}
        />
        <Stat label="Total Fleet" value={equipment.total} tone="muted" />
      </div>

      <div>
        <div className="mb-1 flex justify-between text-label text-muted-foreground">
          <span>Deployment rate</span>
          <span>{equipment.utilizationPercent}%</span>
        </div>
        <ProgressBar value={equipment.utilizationPercent} />
      </div>
    </WidgetContainer>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "success" | "primary" | "warning" | "muted";
  icon?: typeof Wrench;
}) {
  const colors = {
    success: "text-success",
    primary: "text-primary",
    warning: "text-warning",
    muted: "text-foreground",
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-2">
      <div className="flex items-center gap-1">
        {Icon ? <Icon className="size-3 text-warning" aria-hidden /> : null}
        <span className="text-label text-muted-foreground">{label}</span>
      </div>
      <p className={cn("font-mono text-subheading font-semibold", colors[tone])}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}
