"use client";

import * as React from "react";
import * as RadixRadio from "@radix-ui/react-radio-group";
import { cn } from "@/lib/cn";

export function RadioGroup({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadixRadio.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      className={cn("space-y-1.5", className)}
    >
      {options.map((option) => {
        const id = `${ariaLabel}-${option.value}`;
        return (
          <div key={option.value} className="flex items-center gap-2">
            <RadixRadio.Item
              id={id}
              value={option.value}
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border-[1.5px] border-brand-300 bg-surface outline-none transition-all",
                "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
                "data-[state=checked]:border-brand-600"
              )}
            >
              <RadixRadio.Indicator className="flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-brand-600" />
            </RadixRadio.Item>
            <label
              htmlFor={id}
              className="cursor-pointer text-xs font-medium text-on-surface"
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </RadixRadio.Root>
  );
}
