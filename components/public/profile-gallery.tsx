"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { PROFILE_SLIDES } from "@/lib/config/profile-slides";
import { PublicPageContainer } from "@/components/public/public-page-container";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";

const TOTAL = PROFILE_SLIDES.length;
const PROGRAM_EMAIL = "okb@dpwh.gov.ph";
const PROGRAM_HOTLINE = "(02) 165-02";

export function ProfileGallery() {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const slide = PROFILE_SLIDES[index]!;
  const canGoPrev = index > 0;
  const canGoNext = index < TOTAL - 1;

  const goPrev = useCallback(() => {
    setIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => (current < TOTAL - 1 ? current + 1 : current));
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

  const copy = {
    initial: { opacity: 0, y: reduce ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -6 },
    transition: { duration: reduce ? 0 : 0.28, ease: "easeOut" as const },
  };

  return (
    <section className="okb-folio">
      <div className="okb-folio-art" aria-hidden>
        <span className="okb-folio-art__aurora" />
        <span className="okb-folio-art__aurora okb-folio-art__aurora--warm" />
        <span className="okb-folio-art__grid" />
        <span className="okb-folio-art__grain" />
        <span className="okb-folio-art__vignette" />
      </div>
      <span className="okb-folio-glow" aria-hidden />

      <PublicPageContainer>
        <header className="okb-folio-intro">
          <p className="okb-folio-chip">
            <span className="okb-folio-chip__dot" aria-hidden />
            Program portfolio · {String(TOTAL).padStart(2, "0")} slides
          </p>
          <motion.h1
            key={`title-${slide.id}`}
            className="okb-folio-title"
            {...copy}
          >
            {slide.title}
          </motion.h1>
          <motion.p
            key={`caption-${slide.id}`}
            className="okb-folio-lead"
            {...copy}
          >
            {slide.caption}
          </motion.p>
        </header>

        <div
          className="okb-folio-stage"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="okb-folio-frame">
            <span className="okb-folio-crop okb-folio-crop--tl" aria-hidden />
            <span className="okb-folio-crop okb-folio-crop--tr" aria-hidden />
            <span className="okb-folio-crop okb-folio-crop--bl" aria-hidden />
            <span className="okb-folio-crop okb-folio-crop--br" aria-hidden />

            <button
              type="button"
              onClick={() => setEnlarged(true)}
              aria-label={`Enlarge ${slide.title}`}
              className="okb-folio-shot"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.title}
                width={1080}
                height={1350}
                className="okb-folio-shot__img"
                draggable={false}
              />
              <span className="okb-folio-shot__hint">
                <Expand aria-hidden />
                Enlarge
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="Previous slide"
            className="okb-folio-nav okb-folio-nav--prev"
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Next slide"
            className="okb-folio-nav okb-folio-nav--next"
          >
            <ChevronRight aria-hidden />
          </button>
        </div>

        <div className="okb-folio-meta">
          <p className="okb-folio-count" aria-live="polite">
            <span>{String(slide.id).padStart(2, "0")}</span>
            <span className="okb-folio-count__rule" aria-hidden />
            {String(TOTAL).padStart(2, "0")}
          </p>

          <ol className="okb-folio-ticks" aria-label="Portfolio slides">
            {PROFILE_SLIDES.map((item, itemIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    itemIndex === index
                      ? "okb-folio-tick okb-folio-tick--on"
                      : "okb-folio-tick"
                  }
                  aria-label={`Slide ${item.id}: ${item.title}`}
                  aria-current={itemIndex === index ? "true" : undefined}
                  onClick={() => setIndex(itemIndex)}
                />
              </li>
            ))}
          </ol>
        </div>

        <div className="okb-folio-contact">
          <a href="tel:16502" className="okb-folio-contact__item">
            <Phone aria-hidden />
            <span>
              <em>Hotline</em>
              {PROGRAM_HOTLINE}
            </span>
          </a>
          <a href={`mailto:${PROGRAM_EMAIL}`} className="okb-folio-contact__item">
            <Mail aria-hidden />
            <span>
              <em>Program desk</em>
              {PROGRAM_EMAIL}
            </span>
          </a>
        </div>
      </PublicPageContainer>

      {enlarged ? (
        <Portal>
          <div
            className="okb-folio-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged portfolio slide"
            onClick={closeEnlarged}
          >
            <div
              className="okb-folio-lightbox__stage"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <button
                type="button"
                onClick={closeEnlarged}
                aria-label="Close"
                className="okb-folio-lightbox__close"
              >
                <X aria-hidden />
              </button>

              <button
                type="button"
                onClick={goPrev}
                disabled={!canGoPrev}
                aria-label="Previous slide"
                className="okb-folio-nav okb-folio-nav--prev"
              >
                <ChevronLeft aria-hidden />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.title}
                width={1080}
                height={1350}
                className="okb-folio-lightbox__img"
                draggable={false}
              />

              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                aria-label="Next slide"
                className="okb-folio-nav okb-folio-nav--next"
              >
                <ChevronRight aria-hidden />
              </button>

              <p className="okb-folio-lightbox__cap">
                <span>{String(slide.id).padStart(2, "0")}</span>
                {slide.title}
              </p>
            </div>
          </div>
        </Portal>
      ) : null}
    </section>
  );
}
