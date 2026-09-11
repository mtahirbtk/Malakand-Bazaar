"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Input } from "./input";
import type { SelectOption } from "./select";

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  function choose(next: string) {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-10 items-center justify-between gap-1.5 rounded-lg border border-surface-border bg-surface px-3",
          "text-xs font-bold text-on-surface outline-none transition-colors hover:border-brand-400",
          "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-on-surface-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="expand_more" size={16} className="shrink-0 text-brand-500" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] w-72 overflow-hidden rounded-lg border border-surface-border bg-surface shadow-floating"
        >
          <div className="border-b border-surface-border p-2">
            <Input
              autoFocus
              inputSize="sm"
              leadingIcon="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="custom-scrollbar max-h-64 overflow-y-auto p-1"
          >
            {filtered.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-on-surface-muted">
                {emptyText}
              </li>
            )}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-semibold text-on-surface",
                    "hover:bg-brand-50 hover:text-brand-700",
                    option.value === value &&
                      "bg-brand-600 text-white hover:bg-brand-600 hover:text-white"
                  )}
                >
                  {option.icon && <Icon name={option.icon} size={16} />}
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
