import type { ReactNode } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/utils/cn";

interface WidgetContainerProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
  glass?: boolean;
  /** Smallest readable chrome for dense side panels. */
  compact?: boolean;
}

/** Reusable dashboard widget shell with consistent panel chrome. */
export function WidgetContainer({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  noPadding = false,
  glass = true,
  compact = false,
}: WidgetContainerProps) {
  return (
    <Panel glass={glass} className={cn("min-h-0", className)}>
      <PanelHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actions={actions}
        className={cn(
          "py-2.5",
          compact &&
            "gap-2 px-2.5 py-1.5 [&_h3]:text-xs [&_p]:text-[10px] [&_svg]:size-3.5",
        )}
      />
      <PanelBody
        className={cn(compact && "p-2", noPadding && "p-0", bodyClassName)}
      >
        {children}
      </PanelBody>
    </Panel>
  );
}
