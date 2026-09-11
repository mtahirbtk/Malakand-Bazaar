"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type SelectOption = {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  variant = "default",
  selectSize = "md",
  className,
  chevronClassName = "text-brand-500",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel: string;
  variant?: "default" | "bare";
  selectSize?: "sm" | "md";
  className?: string;
  /** Override the chevron's colour — e.g. on a dark or coloured trigger. */
  chevronClassName?: string;
}) {
  return (
    <RadixSelect.Root value={value || undefined} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-1.5 font-bold text-on-surface outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 data-[placeholder]:text-on-surface-muted",
          variant === "default" &&
            "rounded-lg border border-surface-border bg-surface hover:border-brand-400",
          variant === "bare" && "border-0 bg-transparent",
          selectSize === "md" ? "h-10 px-3 text-xs" : "h-8 px-2.5 text-[11px]",
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <Icon name="expand_more" size={16} className={chevronClassName} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            // Above Drawer's z-[80]/z-[70] — a Select opened inside a Drawer
            // (e.g. the mobile hamburger menu) must render on top of it, not
            // underneath where clicks land on the overlay instead.
            "z-[110] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg",
            "border border-surface-border bg-surface shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <RadixSelect.Viewport className="max-h-72 p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-2 text-xs font-semibold text-on-surface outline-none",
                  "data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700",
                  "data-[state=checked]:bg-brand-600 data-[state=checked]:text-white",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                )}
              >
                {option.icon && <Icon name={option.icon} size={16} />}
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
