"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/cn";

/**
 * The blocking overlay, for waits the user must not act through: a sign-in
 * round trip, a listing being published, a page transition that has already
 * run long enough to need acknowledging.
 *
 * The medallion is the logo mark on a brand-50 disc inside two counter-rotating
 * arcs — brand-600 sweeping forward over a brand-200 track, tertiary sand
 * drifting the other way more slowly. Two speeds in opposite directions is
 * what stops it reading as a generic spinner with a picture in the middle.
 *
 * Reduced motion stops both arcs and leaves a slow opacity pulse, so the page
 * still says "working" without spinning anything.
 */
export function FullscreenLoader({
  label,
  /** Renders in place rather than portalled — for Storybook-style galleries. */
  inline = false,
}: {
  label?: string;
  inline?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // While open, the page behind must not scroll under the overlay.
  React.useEffect(() => {
    if (inline) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [inline]);

  const overlay = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "z-[100] flex flex-col items-center justify-center gap-5",
        inline
          ? "relative min-h-64 w-full rounded-2xl bg-background/60"
          : "fixed inset-0 bg-background/80 backdrop-blur-sm"
      )}
    >
      <Medallion />
      {label ? (
        <p className="max-w-xs px-6 text-center text-sm font-semibold text-on-surface-muted">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );

  if (inline) return overlay;
  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

function Medallion() {
  return (
    <span className="relative grid h-24 w-24 place-items-center">
      {/* Halo — the only thing that keeps moving under reduced motion. */}
      <span className="absolute inset-0 rounded-full bg-brand-100/70 motion-safe:animate-ping [animation-duration:2.4s]" />
      <span className="absolute inset-0 rounded-full bg-brand-50 motion-reduce:animate-pulse" />

      {/* Outer sweep, brand-600 over a brand-200 track. */}
      <span className="absolute inset-0 rounded-full border-[3px] border-brand-200" />
      <span
        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-brand-600 border-r-brand-600 motion-safe:animate-spin"
        style={{ animationDuration: "1.2s", animationTimingFunction: "cubic-bezier(0.5, 0, 0.5, 1)" }}
      />

      {/* Inner counter-rotation in sand, slower, for depth. */}
      <span
        className="absolute inset-[9px] rounded-full border-2 border-transparent border-b-tertiary motion-safe:animate-spin"
        style={{ animationDuration: "2.6s", animationDirection: "reverse" }}
      />

      <BrandMark className="relative h-10 w-10" />
    </span>
  );
}

/**
 * Shows the overlay only once a wait has outlasted `delayMs`.
 *
 * A loader that appears for 80ms is worse than none — it reads as a flash of
 * broken layout. Fast responses finish before this ever renders.
 */
export function DeferredFullscreenLoader({
  active,
  label,
  delayMs = 300,
}: {
  active: boolean;
  label?: string;
  delayMs?: number;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  if (!visible) return null;
  return <FullscreenLoader label={label} />;
}
