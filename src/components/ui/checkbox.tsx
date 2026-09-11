"use client";

import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  count,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  count?: number;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded p-1.5 transition-colors hover:bg-brand-50",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <RadixCheckbox.Root
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(c) => onCheckedChange(c === true)}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded border-[1.5px] outline-none transition-all",
            "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
            "border-brand-300 bg-surface",
            "data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600"
          )}
        >
          <RadixCheckbox.Indicator className="flex items-center justify-center text-white">
            <Icon name="check" size={12} />
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label
          htmlFor={id}
          className="cursor-pointer truncate text-xs font-medium text-on-surface peer-data-[state=checked]:font-semibold"
        >
          {label}
        </label>
      </div>
      {count !== undefined && (
        <span className="tabular shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-muted">
          {count}
        </span>
      )}
    </div>
  );
}
