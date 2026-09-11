"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Chip({
  label,
  active,
  count,
  onClick,
  onRemove,
  className,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  const body = (
    <>
      {label}
      {count !== undefined && <span className="tabular opacity-70">({count})</span>}
    </>
  );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-surface-border bg-surface text-on-surface hover:border-brand-400",
        className
      )}
    >
      {onClick ? (
        <button
          type="button"
          aria-pressed={active}
          onClick={onClick}
          className="inline-flex items-center gap-1"
        >
          {body}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">{body}</span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="ml-0.5 font-bold hover:text-danger"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </span>
  );
}
