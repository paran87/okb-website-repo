"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { OPERATIONAL_CYCLE } from "@/lib/config/okb-framework";
import { cn } from "@/utils/cn";

const POSITIONS = [
  { x: 50, y: 12 },
  { x: 78, y: 28 },
  { x: 88, y: 58 },
  { x: 72, y: 84 },
  { x: 50, y: 92 },
  { x: 28, y: 84 },
  { x: 12, y: 58 },
  { x: 22, y: 28 },
] as const;

/** Interactive eight-stage operational cycle from the OKB memorandum. */
export function FrameworkCycle() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const step = OPERATIONAL_CYCLE[active]!;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="var(--dpwh-blue)"
            strokeWidth="0.6"
            opacity="0.18"
          />
          <circle
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="var(--dpwh-orange)"
            strokeWidth="1.2"
            strokeDasharray="8 10"
            className={reduce ? undefined : "okb-fw-orbit"}
          />
        </svg>

        <div className="pointer-events-none absolute inset-[28%] flex items-center justify-center rounded-full border border-[var(--dpwh-border)] bg-[var(--dpwh-panel)] text-center shadow-sm">
          <div className="px-4">
            <p className="okb-public-eyebrow">Cycle</p>
            <p className="okb-public-heading mt-1 text-lg leading-tight sm:text-xl">
              Continuous operations
            </p>
          </div>
        </div>

        {OPERATIONAL_CYCLE.map((item, index) => {
          const pos = POSITIONS[index]!;
          const selected = index === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              onMouseEnter={() => setActive(index)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className={cn(
                "absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-bold sm:size-16 md:size-20",
                selected
                  ? "border-[var(--dpwh-orange)] bg-[var(--dpwh-orange)] text-white shadow-md"
                  : "border-[var(--dpwh-blue)] bg-white text-[var(--dpwh-blue-dark)] hover:border-[var(--dpwh-orange)]",
              )}
              aria-pressed={selected}
            >
              <span className="px-1 text-center">{index + 1}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={step.id}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="okb-public-card rounded-sm p-6 sm:p-8"
      >
        <p className="okb-public-eyebrow">
          Stage {active + 1} of {OPERATIONAL_CYCLE.length}
        </p>
        <h3 className="okb-public-heading mt-2 text-2xl sm:text-3xl">{step.title}</h3>
        <p className="okb-public-body mt-4 text-base sm:text-lg">{step.body}</p>
        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OPERATIONAL_CYCLE.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "w-full rounded-sm border px-2 py-2 text-left text-[0.7rem] font-semibold",
                  index === active
                    ? "border-[var(--dpwh-orange)] bg-[var(--dpwh-orange-light)] text-[var(--dpwh-blue-dark)]"
                    : "border-[var(--dpwh-border)] text-[var(--dpwh-muted)] hover:border-[var(--dpwh-blue)]",
                )}
              >
                {index + 1}. {item.title}
              </button>
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
}
