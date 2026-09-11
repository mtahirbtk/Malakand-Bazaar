import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Breadcrumb({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-[11px] font-semibold", className)}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && (
            <Icon name="chevron_right" size={14} className="text-on-surface-muted/60" />
          )}
          {item.href ? (
            <a
              href={item.href}
              className="text-on-surface-muted hover:text-brand-600 hover:underline"
            >
              {item.label}
            </a>
          ) : (
            <span aria-current="page" className="text-brand-700">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
