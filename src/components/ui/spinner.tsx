import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * The small-task loader: inside buttons, beside inline actions, in table rows.
 *
 * A conic gradient masked to a thin annulus, so the ring fades from solid to
 * transparent as it sweeps rather than being a plain rotating arc. The track
 * behind it stays visible, which reads as progress rather than as a missing
 * element.
 *
 * Colour is brand-600: this is an interactive-state affordance, and per
 * docs/palette.md that is the default answer. brand-800 is reserved for
 * primary CTAs, prices and page titles, so it never appears here.
 */

const SIZES = {
  sm: { box: "h-4 w-4", ring: 2 },
  md: { box: "h-6 w-6", ring: 2.5 },
  lg: { box: "h-9 w-9", ring: 3 },
} as const;

export type SpinnerSize = keyof typeof SIZES;

export function Spinner({
  size = "md",
  tone = "brand",
  className,
  label,
}: {
  size?: SpinnerSize;
  /** `onBrand` for use on a saturated brand fill, such as inside a primary button. */
  tone?: "brand" | "onBrand" | "muted";
  className?: string;
  /**
   * Announced to screen readers. Omit inside a control that already sets
   * aria-busy or has its own label — two announcements for one wait is noise.
   */
  label?: string;
}) {
  const { box, ring } = SIZES[size];

  const colour =
    tone === "onBrand"
      ? "rgb(255 255 255)"
      : tone === "muted"
        ? "rgb(var(--spinner-muted, 130 143 136))"
        : "rgb(45 118 89)"; // brand-600

  const track = tone === "onBrand" ? "rgba(255,255,255,0.25)" : "rgba(45,118,89,0.18)";

  return (
    <span
      className={cn("relative inline-block shrink-0 align-[-0.125em]", box, className)}
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {/* Track */}
      <span
        className="absolute inset-0 rounded-full"
        style={{ border: `${ring}px solid ${track}` }}
      />
      {/* Sweep: conic gradient clipped to the same annulus by a radial mask. */}
      <span
        className="absolute inset-0 rounded-full motion-safe:animate-spin"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${colour} 300deg, ${colour} 360deg)`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
          animationDuration: "1.1s",
          animationTimingFunction: "linear",
        }}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
