import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export type IconButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground hover:bg-muted/70",
  outline: "border border-border text-foreground hover:bg-muted/50",
  ghost: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const ICON_PX: Record<IconButtonSize, number> = { sm: 16, md: 18, lg: 22 };

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Required for accessibility — icon-only buttons need a label. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

/** Square, icon-only button with an enforced accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: IconComponent,
      label,
      variant = "ghost",
      size = "md",
      isLoading = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={ICON_PX[size]} aria-hidden />
        ) : (
          <IconComponent size={ICON_PX[size]} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
