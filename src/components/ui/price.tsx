import * as React from "react";
import { cn } from "@/lib/cn";
import { formatPkr } from "@/lib/format";

const sizes = {
  sm: "text-xs",
  md: "text-sm sm:text-base",
  lg: "text-xl sm:text-2xl",
};

export function Price({
  value,
  compareAt,
  size = "md",
  className,
}: {
  value: number;
  compareAt?: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span className={cn("flex items-baseline gap-1.5", className)}>
      <span className={cn("tabular font-extrabold text-primary", sizes[size])}>
        {formatPkr(value)}
      </span>
      {compareAt !== undefined && compareAt > value && (
        <span className="tabular text-[11px] text-neutral-400 line-through">
          {Math.round(compareAt).toLocaleString("en-US")}
        </span>
      )}
    </span>
  );
}
