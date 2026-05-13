"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LightboxPhoto = {
  src: string;
  label: string;
};

export function LightboxImage({
  photos,
  index,
  className,
  priority = false,
  sizes = "(min-width: 1280px) 32vw, (min-width: 768px) 50vw, 100vw",
  overlayEyebrow,
}: {
  photos: LightboxPhoto[];
  index: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  overlayEyebrow?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerPhoto = photos[index];
  const activePhoto = activeIndex === null ? null : photos[activeIndex];
  const hasMultiplePhotos = photos.length > 1;

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current - 1 + photos.length) % photos.length,
    );
  }, [photos.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % photos.length,
    );
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }
      if (event.key === "ArrowLeft") {
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        showNext();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, showNext, showPrevious]);

  if (!triggerPhoto) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setActiveIndex(index)}
        className={cn(
          "grain-overlay group relative block w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#201b16] text-left shadow-[0_16px_42px_rgba(18,16,14,0.14)] transition duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.035] hover:shadow-[0_28px_70px_rgba(18,16,14,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(150,114,79,0.28)]",
          className,
        )}
        aria-label={`Open ${triggerPhoto.label}`}
      >
        <Image
          src={triggerPhoto.src}
          alt={triggerPhoto.label}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,10,0.08)_0%,rgba(18,14,10,0.68)_100%)]" />
        <div className="relative flex h-full min-h-[220px] items-end p-4 sm:p-6">
          <div>
            {overlayEyebrow ? (
              <span className="text-[11px] uppercase tracking-[0.26em] text-white/72">
                {overlayEyebrow}
              </span>
            ) : null}
            <p
              className={cn(
                "max-w-xs break-words font-display text-2xl leading-none text-white sm:text-3xl",
                overlayEyebrow ? "mt-2" : undefined,
              )}
            >
              {triggerPhoto.label}
            </p>
          </div>
        </div>
      </button>

      {activePhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-4 py-6 backdrop-blur-sm sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.label}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setActiveIndex(null)}
            aria-label="Close image preview"
          />
          <div className="relative z-10 flex h-full w-full max-w-6xl items-center justify-center">
            <div className="relative h-[78vh] w-full overflow-hidden rounded-[24px] bg-black shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
              <Image
                src={activePhoto.src}
                alt={activePhoto.label}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <p className="absolute bottom-4 left-4 right-4 rounded-full bg-black/42 px-5 py-3 text-center font-display text-xl leading-none text-white backdrop-blur-sm sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:text-2xl">
              {activePhoto.label}
            </p>
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-foreground)] shadow-lg transition hover:scale-105 hover:bg-[var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>
            {hasMultiplePhotos ? (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  className="absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[var(--color-foreground)] shadow-lg transition hover:scale-105 hover:bg-[var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:left-4"
                  aria-label="Show previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[var(--color-foreground)] shadow-lg transition hover:scale-105 hover:bg-[var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:right-4"
                  aria-label="Show next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
