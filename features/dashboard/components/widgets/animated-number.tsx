"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils/cn";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

/** Smooth count-up animation for KPI values. */
export function AnimatedNumber({
  value,
  duration = 800,
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = display;
    const delta = value - from;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + delta * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from current display
  }, [value, duration, reduce]);

  return (
    <span className={cn("font-mono tabular-nums", className)}>{display}</span>
  );
}
