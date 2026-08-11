import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const VARIANT_META: Record<
  AlertVariant,
  { icon: LucideIcon; accent: string; ring: string }
> = {
  info: { icon: Info, accent: "text-info", ring: "border-info/40 bg-info/10" },
  success: {
    icon: CircleCheck,
    accent: "text-success",
    ring: "border-success/40 bg-success/10",
  },
  warning: {
    icon: TriangleAlert,
    accent: "text-warning",
    ring: "border-warning/40 bg-warning/10",
  },
  danger: {
    icon: CircleX,
    accent: "text-danger",
    ring: "border-danger/40 bg-danger/10",
  },
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

/** Inline contextual alert. */
export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className,
}: AlertProps) {
  const meta = VARIANT_META[variant];
  const IconComponent = meta.icon;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3.5",
        meta.ring,
        className,
      )}
    >
      <IconComponent
        className={cn("mt-0.5 size-5 shrink-0", meta.accent)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-body font-semibold text-foreground">{title}</p>
        ) : null}
        {children ? (
          <div className="text-caption text-muted-foreground">{children}</div>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
