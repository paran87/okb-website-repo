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
}: WidgetContainerProps) {
  return (
    <Panel glass={glass} className={cn("min-h-0", className)}>
      <PanelHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actions={actions}
        className="py-2.5"
      />
      <PanelBody className={cn(noPadding && "p-0", bodyClassName)}>
        {children}
      </PanelBody>
    </Panel>
  );
}
