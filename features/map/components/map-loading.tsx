import { cn } from "@/utils/cn";

interface MapLoadingProps {
  label?: string;
  className?: string;
}

/** Map canvas loading overlay. */
export function MapLoading({
  label = "Initializing GIS engine…",
  className,
}: MapLoadingProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="ops-grid absolute inset-0 opacity-30" aria-hidden />
      <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-caption font-medium text-foreground">{label}</p>
    </div>
  );
}
