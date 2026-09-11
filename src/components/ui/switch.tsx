"use client";

import * as React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className={cn(
          "h-5 w-9 shrink-0 rounded-full bg-neutral-300 outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "data-[state=checked]:bg-primary"
        )}
      >
        <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </RadixSwitch.Root>
      <label htmlFor={id} className="cursor-pointer text-xs font-medium text-on-surface">
        {label}
      </label>
    </div>
  );
}
