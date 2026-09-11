"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function paginationRange(
  page: number,
  pageCount: number
): (number | "ellipsis")[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const out: (number | "ellipsis")[] = [];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  out.push(1);
  if (start > 2) out.push("ellipsis");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount - 1) out.push("ellipsis");
  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  labels,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labels: { previous: string; next: string; page: string };
  className?: string;
}) {
  const range = paginationRange(page, pageCount);
  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(
          base,
          "border-surface-border bg-surface text-primary hover:bg-surface-low"
        )}
      >
        <Icon name="chevron_left" size={16} />
        <span className="sr-only">{labels.previous}</span>
      </button>

      {range.map((entry, i) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-on-surface-muted">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`${labels.page} ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onPageChange(entry)}
            className={cn(
              base,
              entry === page
                ? "border-primary bg-primary text-white"
                : "border-surface-border bg-surface text-on-surface hover:bg-surface-low"
            )}
          >
            {entry}
          </button>
        )
      )}

      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={cn(
          base,
          "border-surface-border bg-surface text-primary hover:bg-surface-low"
        )}
      >
        <span className="sr-only">{labels.next}</span>
        <Icon name="chevron_right" size={16} />
      </button>
    </nav>
  );
}
