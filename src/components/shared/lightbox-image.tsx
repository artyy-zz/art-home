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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,10,0.04)_0%,rgba(18,14,10,0.12)_48%,rgba(18,14,10,0.74)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 px-3 py-5 backdrop-blur-md sm:px-14 sm:py-8"
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
          <div className="relative z-10 flex h-full w-full items-center justify-center">
            <div className="relative h-[88vh] w-[92vw] overflow-hidden rounded-[18px] bg-neutral-950 shadow-[0_34px_100px_rgba(0,0,0,0.58)] ring-1 ring-white/10 max-sm:h-[82vh] max-sm:w-[94vw]">
              <Image
                src={activePhoto.src}
                alt={activePhoto.label}
                fill
                sizes="92vw"
                className="object-contain"
                priority
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="fixed right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-white/88 transition hover:scale-105 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              aria-label="Close image preview"
            >
              <X className="h-8 w-8" />
            </button>
            {hasMultiplePhotos ? (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  className="fixed left-3 top-1/2 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition hover:scale-110 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:left-8"
                  aria-label="Show previous image"
                >
                  <ChevronLeft className="h-9 w-9" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="fixed right-3 top-1/2 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition hover:scale-110 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:right-8"
                  aria-label="Show next image"
                >
                  <ChevronRight className="h-9 w-9" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
