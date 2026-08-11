import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/utils/cn";

/** Standard icon sizing scale (px) used across the app. */
export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

export type IconTone =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONE_CLASSES: Record<IconTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

interface IconProps extends Omit<LucideProps, "size" | "ref"> {
  icon: LucideIcon;
  size?: IconSize;
  tone?: IconTone;
}

/**
 * Unified icon renderer. Wrapping Lucide behind a single component keeps sizing,
 * stroke width, status color, and a11y defaults consistent everywhere.
 */
export function Icon({
  icon: LucideComponent,
  size = "md",
  tone = "default",
  className,
  ...props
}: IconProps) {
  return (
    <LucideComponent
      size={ICON_SIZES[size]}
      strokeWidth={1.75}
      className={cn(TONE_CLASSES[tone], className)}
      {...props}
    />
  );
}
