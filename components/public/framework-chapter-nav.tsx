"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface FrameworkChapter {
  id: string;
  label: string;
}

/** Height of the sticky site header right now (it condenses on scroll). */
function headerBottom(): number {
  const header = document.querySelector(".okb-public-header");
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

/**
 * Sticky chapter bar for the long framework page: sits under the site header, highlights the chapter in view and
 * jumps to a chapter on tap. Scrolls sideways inside itself on a phone; the page never does.
 */
export function FrameworkChapterNav({ chapters }: { chapters: readonly FrameworkChapter[] }) {
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)") === true;
  const nav = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [active, setActive] = useState<string | null>(null);

  // Stick right under the header, whatever height it has.
  useEffect(() => {
    const header = document.querySelector(".okb-public-header");
    if (!header) return;
    const update = () => setTop(Math.round(header.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // The active chapter is the last one whose top has passed under the bars.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = headerBottom() + (nav.current?.offsetHeight ?? 0) + 24;
      let current: string | null = null;
      for (const c of chapters) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= line) current = c.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [chapters]);

  // Keep the active pill in view inside the bar (without moving the page).
  useEffect(() => {
    const box = track.current;
    if (!box) return;
    const el = active ? box.querySelector<HTMLElement>(`[data-chapter="${active}"]`) : null;
    if (!el) {
      box.scrollTo({ left: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  return (
    <nav ref={nav} aria-label="Framework chapters" className="okb-fw-chapters" style={{ top }}>
      <div ref={track} className="okb-public-container okb-fw-chapters__track px-4 sm:px-6 lg:px-8">
        {chapters.map((c, i) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            data-chapter={c.id}
            aria-current={active === c.id ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              scrollToChapter(c.id, reduce);
            }}
            className="okb-fw-chapter"
          >
            <span className="okb-fw-chapter__num">{String(i + 1).padStart(2, "0")}</span>
            {c.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** Jump to a chapter from anywhere on the page (the "at a glance" tiles), clearing both sticky bars. */
export function scrollToChapter(id: string, reduce: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  const bar = document.querySelector<HTMLElement>(".okb-fw-chapters");
  const offset = headerBottom() + (bar?.offsetHeight ?? 0) - 1;
  window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset, behavior: reduce ? "auto" : "smooth" });
  history.replaceState(null, "", `#${id}`);
}
