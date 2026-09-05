"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Globe, Phone, X } from "lucide-react";
import { PROFILE_SLIDES } from "@/lib/config/profile-slides";
import { PublicPageContainer } from "@/components/public/public-page-container";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";

export function ProfileGallery() {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
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

  const closeEnlarged = useCallback(() => {
    setEnlarged(false);
  }, []);

  useEscapeKey(enlarged, closeEnlarged);
  useLockBodyScroll(enlarged);

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
        <div className="okb-public-container-narrow">
          <div
            className="relative"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <figure className="overflow-hidden rounded-sm border-2 border-[var(--dpwh-border)] bg-white p-2 shadow-sm sm:p-4">
              <button
                type="button"
                onClick={() => setEnlarged(true)}
                aria-label={`Enlarge ${slide.title}`}
                className="block w-full cursor-zoom-in"
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
              </button>
            </figure>

            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Previous slide"
              className="okb-public-slide-side-btn left-2 sm:left-3"
            >
              <ChevronLeft className="size-6 shrink-0 sm:size-8" aria-hidden />
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              aria-label="Next slide"
              className="okb-public-slide-side-btn right-2 sm:right-3"
            >
              <ChevronRight className="size-6 shrink-0 sm:size-8" aria-hidden />
            </button>
          </div>

          <p className="okb-public-accent-blue mt-4 text-center text-sm font-bold tracking-widest">
            {String(slide.id).padStart(2, "0")}{" "}
            <span className="okb-public-slide-count-muted">/</span>{" "}
            {String(PROFILE_SLIDES.length).padStart(2, "0")}
          </p>
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

      {enlarged ? (
        <Portal>
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged portfolio slide"
            onClick={closeEnlarged}
          >
            <div
              className="relative max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <button
                type="button"
                onClick={closeEnlarged}
                aria-label="Close"
                className="okb-public-lightbox-close"
              >
                <X className="size-5 sm:size-6" aria-hidden />
              </button>

              <button
                type="button"
                onClick={goPrev}
                disabled={!canGoPrev}
                aria-label="Previous slide"
                className="okb-public-lightbox-side-btn left-2 sm:left-3"
              >
                <ChevronLeft className="size-7 shrink-0 sm:size-9" aria-hidden />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.title}
                width={1080}
                height={1350}
                className="max-h-[92vh] w-auto max-w-[min(96vw,1400px)] object-contain"
                draggable={false}
              />

              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                aria-label="Next slide"
                className="okb-public-lightbox-side-btn right-2 sm:right-3"
              >
                <ChevronRight className="size-7 shrink-0 sm:size-9" aria-hidden />
              </button>
            </div>
          </div>
        </Portal>
      ) : null}
    </section>
  );
}
