import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  leadingIcon?: string;
  trailingIcon?: string;
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      leadingIcon,
      trailingIcon,
      invalid,
      inputSize = "md",
      ...props
    },
    ref
  ) => (
    <div className="relative flex w-full items-center">
      {leadingIcon && (
        <Icon
          name={leadingIcon}
          size={18}
          className="pointer-events-none absolute left-3 text-brand-500"
        />
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-lg border bg-surface text-on-surface placeholder:text-on-surface-muted/70",
          "transition-shadow focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600",
          inputSize === "md" ? "h-12 px-3.5 text-sm" : "h-9 px-3 text-xs",
          leadingIcon && "pl-9",
          trailingIcon && "pr-9",
          invalid ? "border-danger" : "border-surface-border",
          className
        )}
        {...props}
      />
      {trailingIcon && (
        <Icon
          name={trailingIcon}
          size={18}
          className="pointer-events-none absolute right-3 text-on-surface-muted"
        />
      )}
    </div>
  )
);
Input.displayName = "Input";
