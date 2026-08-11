import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface MapErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Map initialization error state. */
export function MapError({
  message = "The map engine failed to initialize.",
  onRetry,
  className,
}: MapErrorProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center",
        className,
      )}
      role="alert"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-danger/15 text-danger">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <p className="text-body font-medium text-foreground">Map Error</p>
      <p className="max-w-sm text-caption text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
