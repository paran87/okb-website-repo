"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CheckCircle2, Droplets, FlaskConical, Recycle, Search, Truck, Waves, type LucideIcon } from "lucide-react";
import { INTERVENTION_SCOPES } from "@/lib/config/okb-framework";

const SCOPE_UI: Record<(typeof INTERVENTION_SCOPES)[number]["id"], { icon: LucideIcon; short: string }> = {
  waterways: { icon: Waves, short: "Waterways" },
  drainage: { icon: Droplets, short: "Drainage" },
  facilities: { icon: Activity, short: "Flood facilities" },
  waste: { icon: Recycle, short: "Solid waste" },
  monitoring: { icon: Search, short: "Monitoring" },
  research: { icon: FlaskConical, short: "Research" },
};

/** The six fields of work as tabs: every field is one tap away, and only one long list is on screen at a time. */
export function FrameworkScopeTabs() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const scope = INTERVENTION_SCOPES[active]!;
  const { icon: Icon } = SCOPE_UI[scope.id];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = INTERVENTION_SCOPES.length;
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (active + step + n) % n;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="okb-fw-scope">
      <div role="tablist" aria-label="Fields of work" aria-orientation="vertical" className="okb-fw-scope__tabs" onKeyDown={onKeyDown}>
        {INTERVENTION_SCOPES.map((s, i) => {
          const ui = SCOPE_UI[s.id];
          const TabIcon = ui.icon;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${s.id}`}
              aria-selected={i === active}
              aria-controls={`${base}-panel`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className="okb-fw-scope__tab"
            >
              <span className="okb-fw-scope__tab-icon">
                <TabIcon className="size-[1.1rem]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="lg:hidden">{ui.short}</span>
                <span className="hidden lg:inline">{s.title}</span>
              </span>
              <span className="okb-fw-scope__count hidden sm:inline">{s.items.length}</span>
            </button>
          );
        })}
      </div>

      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${scope.id}`} className="okb-fw-scope__panel">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={scope.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="okb-fw-scope__head">
              <span className="okb-fw-scope__head-icon">
                <Icon className="size-6" aria-hidden />
              </span>
              <div className="relative z-10 min-w-0">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--dpwh-gold)]">
                  Field {active + 1} of {INTERVENTION_SCOPES.length} · {scope.items.length} activities
                </p>
                <h3 className="mt-0.5 text-lg font-bold leading-tight sm:text-xl">{scope.title}</h3>
              </div>
            </div>
            <ul className="okb-fw-scope__list">
              {scope.items.map((item) => (
                <li key={item} className="okb-fw-scope__item">
                  <CheckCircle2 className="okb-fw-scope__check size-[1.1rem]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="okb-fw-scope__note">
              <Truck className="mt-0.5 size-[1.1rem] shrink-0 text-[var(--dpwh-orange-dark)]" aria-hidden />
              <span>{scope.note}</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
