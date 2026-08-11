import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ChipProps {
  children: ReactNode;
  onRemove?: () => void;
  selected?: boolean;
  onClick?: () => void;
  leftIcon?: ReactNode;
  className?: string;
}

/** Interactive chip — selectable and/or removable (filters, token inputs). */
export function Chip({
  children,
  onRemove,
  selected = false,
  onClick,
  leftIcon,
  className,
}: ChipProps) {
  const interactive = Boolean(onClick);
  return (
    <span
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-medium transition-colors",
        selected
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-foreground",
        interactive && "cursor-pointer hover:border-primary/60",
        className,
      )}
    >
      {leftIcon}
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
          className="-mr-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
