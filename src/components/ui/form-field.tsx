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
      <label
        htmlFor={htmlFor}
        className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted"
      >
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
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
