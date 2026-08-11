import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-ring",
  secondary:
    "bg-muted text-foreground hover:bg-muted/70 focus-visible:ring-ring",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted/50 focus-visible:ring-ring",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring",
  danger:
    "bg-danger text-white hover:opacity-90 focus-visible:ring-danger",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-caption gap-1.5",
  md: "h-10 px-4 text-body gap-2",
  lg: "h-12 px-6 text-body gap-2",
  icon: "size-10 justify-center",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading ? rightIcon : null}
      </button>
    );
  },
);

Button.displayName = "Button";
