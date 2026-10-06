"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/utils/cn";

interface MapPopupProps {
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  className?: string;
}

/** Floating map popup card (feature detail / quick info). */
export function MapPopup({
  title,
  children,
  footer,
  onClose,
  className,
}: MapPopupProps) {
  return (
    <div
      className={cn(
        "glass w-60 rounded-lg shadow-panel",
        className,
      )}
      role="dialog"
      aria-label={typeof title === "string" ? title : "Map popup"}
    >
      <div className="flex items-start justify-between gap-1 border-b border-border/60 px-2 py-1.5">
        <h3 className="text-xs font-semibold leading-tight text-foreground">{title}</h3>
        {onClose ? (
          <IconButton
            icon={X}
            label="Close popup"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        ) : null}
      </div>
      {children ? (
        <div className="px-2 py-1.5 text-[10px] leading-tight text-muted-foreground">
          {children}
        </div>
      ) : null}
      {footer ? (
        <div className="border-t border-border/60 px-2 py-1.5">{footer}</div>
      ) : null}
    </div>
  );
}
