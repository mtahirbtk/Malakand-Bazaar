import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-28 w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-on-surface",
        "placeholder:text-on-surface-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
        invalid ? "border-danger" : "border-surface-border",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
