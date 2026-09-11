import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-surface-border bg-surface px-6 py-12 text-center",
        className
      )}
    >
      <Icon name={icon} size={44} className="text-brand-300" />
      <h3 className="text-base font-extrabold text-brand-700">{title}</h3>
      {body && <p className="max-w-sm text-xs text-on-surface-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
