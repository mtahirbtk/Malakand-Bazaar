"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Carousel({
  slides,
  autoPlayMs = 4500,
  ariaLabel,
  showDots = true,
  showArrows = true,
  className,
  controlsClassName,
}: {
  slides: React.ReactNode[];
  autoPlayMs?: number;
  ariaLabel: string;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
  controlsClassName?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const reducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const go = React.useCallback(
    (next: number) => setIndex((next + slides.length) % slides.length),
    [slides.length]
  );

  React.useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      autoPlayMs
    );
    return () => clearInterval(id);
  }, [paused, reducedMotion, autoPlayMs, slides.length]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${slides.length}`}
          aria-current={i === index ? "true" : undefined}
          aria-hidden={i !== index}
          className={cn(
            "transition-opacity duration-700 ease-in-out",
            i === index
              ? "opacity-100"
              : "pointer-events-none absolute inset-0 opacity-0"
          )}
        >
          {slide}
        </div>
      ))}

      {slides.length > 1 && (showArrows || showDots) && (
        <div
          className={cn(
            "absolute bottom-5 right-5 z-20 flex items-center gap-2",
            controlsClassName
          )}
        >
          {showArrows && (
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
              className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            >
              <Icon name="chevron_left" size={18} />
            </button>
          )}
          {showDots &&
            slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          {showArrows && (
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
              className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
