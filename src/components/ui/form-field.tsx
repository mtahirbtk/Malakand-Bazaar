import * as React from "react";
import { cn } from "@/lib/cn";

export function FormField({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline gap-0.5">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted"
        >
          {label}
        </label>
        {required && (
          <span aria-hidden="true" className="text-danger">
            *
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-on-surface-muted">{hint}</p>
      ) : null}
    </div>
  );
}
