"use client";

import { cn } from "@/utils/cn";

interface CompassProps {
  bearing?: number;
  className?: string;
}

/** Map orientation compass (displays current bearing). */
export function Compass({ bearing = 0, className }: CompassProps) {
  return (
    <div
      className={cn(
        "glass flex size-12 items-center justify-center rounded-full shadow-panel",
        className,
      )}
      aria-label={`Map bearing ${Math.round(bearing)} degrees`}
    >
      <div
        className="relative size-8"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-map-label font-bold text-danger">
          N
        </span>
        <span
          className="absolute left-1/2 top-1/2 size-0 -translate-x-1/2 -translate-y-1/2 border-x-[5px] border-b-[10px] border-x-transparent border-b-primary"
          aria-hidden
        />
      </div>
    </div>
  );
}
