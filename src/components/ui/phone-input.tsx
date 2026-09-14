import * as React from "react";
import { cn } from "@/lib/cn";
import { stripCountryCode } from "@/lib/phone";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "value" | "onChange"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

/**
 * Pakistani mobile number field: the +92 country code is pinned and
 * non-editable, matching every stored/normalized phone in this app
 * (see lib/phone.ts). The caller still gets/sets the full "+92XXXXXXXXXX"
 * value — only the on-screen digits after the prefix are user-editable.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, invalid, inputSize = "md", ...props }, ref) => {
    const local = stripCountryCode(value);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const nextLocal = stripCountryCode(e.target.value);
      onChange({ ...e, target: { ...e.target, value: `+92${nextLocal}` } });
    }

    return (
      <div className="relative flex w-full items-center">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3.5 text-sm font-semibold text-on-surface-muted"
        >
          +92
        </span>
        <input
          ref={ref}
          type="tel"
          inputMode="tel"
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full rounded-lg border bg-surface text-on-surface placeholder:text-on-surface-muted/70",
            "transition-shadow focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600",
            inputSize === "md" ? "h-12 pl-12 pr-3.5 text-sm" : "h-9 pl-11 pr-3 text-xs",
            invalid ? "border-danger" : "border-surface-border",
            className
          )}
          value={local}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";
