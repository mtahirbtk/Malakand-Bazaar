import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * The logo glyph on its own — the two peaks, the sand arc and the sun — lifted
 * out of BrandLogo without the wordmark, for places too small for type:
 * loaders, avatars, favicons.
 *
 * Colours come from `currentColor` and two tokens rather than the hard-coded
 * hexes in BrandLogo, so the mark works on a tinted loader disc and in both
 * themes.
 */
export function BrandMark({
  className,
  title,
}: {
  className?: string;
  /** Omit for decorative use; the surrounding element carries the label. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d="M3 40L17 14L31 40H3Z" className="fill-brand-800" />
      <path d="M21 40L33 20L45 40H21Z" className="fill-secondary" opacity="0.9" />
      <path
        d="M11 40C15 32 25 32 29 40"
        fill="none"
        className="stroke-tertiary"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="33" cy="12" r="4" className="fill-tertiary" />
    </svg>
  );
}
