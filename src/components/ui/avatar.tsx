import * as React from "react";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
};

export function Avatar({
  initials,
  src,
  alt,
  size = "md",
  className,
}: {
  initials: string;
  src?: string;
  alt: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-brand-100 font-extrabold text-brand-700",
        sizes[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
