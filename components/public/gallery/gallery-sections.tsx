"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GalleryVerticalEnd, Images } from "lucide-react";
import { NcrDailyAccomplishment } from "@/components/public/accomplishment-panels";
import { cn } from "@/utils/cn";

type Section = "media" | "ncr";

/** Gallery: the field photos and videos, and the NCR Daily Accomplishment boards. */
export function GallerySections({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<Section>("media");
  const [ncrOpened, setNcrOpened] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#ncr-daily") {
      setSection("ncr");
      setNcrOpened(true);
    }
  }, []);

  const choose = (next: Section) => {
    setSection(next);
    if (next === "ncr") setNcrOpened(true);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next === "ncr" ? "#ncr-daily" : ""}`);
  };

  const items = [
    { id: "media" as const, label: "Photos & Videos", icon: Images },
    { id: "ncr" as const, label: "NCR Daily Accomplishment", icon: GalleryVerticalEnd },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Gallery sections" className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--dpwh-border)] bg-white p-1.5">
        {items.map(({ id, label, icon: Icon }) => {
          const selected = section === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => choose(id)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-lg px-2 text-center text-[13px] font-bold leading-tight transition-colors sm:text-sm",
                selected ? "bg-[var(--dpwh-blue-dark)] text-white shadow-[inset_0_-3px_0_var(--dpwh-orange)]" : "text-[var(--dpwh-blue-dark)] hover:bg-[var(--dpwh-blue-light)]",
              )}
            >
              <Icon className={cn("size-4 shrink-0", selected ? "text-[var(--dpwh-gold)]" : "text-[var(--dpwh-orange)]")} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" hidden={section !== "media"}>
        {children}
      </div>
      <div role="tabpanel" hidden={section !== "ncr"}>
        {ncrOpened ? <NcrDailyAccomplishment /> : null}
      </div>
    </div>
  );
}
