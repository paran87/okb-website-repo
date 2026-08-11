"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Globe, Phone } from "lucide-react";
import { PROFILE_SLIDES } from "@/lib/config/profile-slides";
import { PublicPageContainer } from "@/components/public/public-page-container";

export function ProfileGallery() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const slide = PROFILE_SLIDES[index]!;
  const canGoPrev = index > 0;
  const canGoNext = index < PROFILE_SLIDES.length - 1;

  const goPrev = useCallback(() => {
    setIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) =>
      current < PROFILE_SLIDES.length - 1 ? current + 1 : current,
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (delta < -56) goNext();
    else if (delta > 56) goPrev();
  };

  return (
    <section className="okb-public-section okb-public-profile-section border-t py-16 sm:py-20">
      <PublicPageContainer>
        <p className="okb-public-eyebrow">
          Office of Undersecretary for Special Concerns
        </p>
        <h2 className="okb-public-heading mt-2 text-2xl sm:text-3xl">
          Program Portfolio
        </h2>
        <p className="okb-public-body okb-public-prose mt-3 text-sm sm:text-base">
          Oplan Kontra Baha briefing materials — launches, field operations,
          inter-agency coordination, and nationwide waterway rehabilitation.
        </p>

        <div className="okb-public-container-narrow mt-10">
          <figure
            className="overflow-hidden rounded-sm border-2 border-[var(--dpwh-border)] bg-white p-2 shadow-sm sm:p-4"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.title}
              width={1080}
              height={1350}
              className="mx-auto block h-auto w-full max-h-[min(75vh,800px)] object-contain"
              draggable={false}
            />
          </figure>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Previous slide"
              className="okb-public-control-btn sm:p-3"
            >
              <ChevronLeft className="size-5 shrink-0 sm:size-6" aria-hidden />
            </button>

            <div className="text-center">
              <p className="okb-public-accent-blue text-sm font-bold tracking-widest">
                {String(slide.id).padStart(2, "0")}{" "}
                <span className="okb-public-slide-count-muted">/</span>{" "}
                {String(PROFILE_SLIDES.length).padStart(2, "0")}
              </p>
              <p className="okb-public-body mt-1 text-xs sm:text-sm">
                Use the arrows or swipe to change slides
              </p>
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              aria-label="Next slide"
              className="okb-public-control-btn sm:p-3"
            >
              <ChevronRight className="size-5 shrink-0 sm:size-6" aria-hidden />
            </button>
          </div>

          <div className="mx-auto mt-5 max-w-xl text-center">
            <p className="okb-public-heading text-base sm:text-lg">{slide.title}</p>
            <p className="okb-public-body mt-1 text-sm">{slide.caption}</p>
          </div>
        </div>

        <div className="okb-profile-footer mt-14 flex flex-col gap-4 rounded-lg border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-[#e5e7eb]">
            <Phone className="okb-public-icon size-5 shrink-0" aria-hidden />
            <span>(02) 165-02</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#e5e7eb]">
            <Globe className="okb-public-icon size-5 shrink-0" aria-hidden />
            <a href="mailto:okb@dpwh.gov.ph" className="okb-public-link">
              okb@dpwh.gov.ph
            </a>
          </div>
        </div>
      </PublicPageContainer>
    </section>
  );
}
