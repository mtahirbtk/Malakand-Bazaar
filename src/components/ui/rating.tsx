"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Rating({
  value,
  count,
  editable = false,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  count?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  if (editable) {
    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel ?? "Rating"}
        className={cn("flex items-center gap-0.5", className)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange?.(star)}
            className="text-tertiary transition-transform hover:scale-110"
          >
            <Icon name="star" size={22} filled={star <= value} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <span
      aria-label={`Rated ${value} out of 5`}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold text-tertiary",
        className
      )}
    >
      <Icon name="star" size={14} filled />
      <span className="tabular">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="tabular font-semibold text-on-surface-muted">({count})</span>
      )}
    </span>
  );
}
