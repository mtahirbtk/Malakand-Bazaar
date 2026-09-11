"use client";

import * as React from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

export function Popover({
  trigger,
  align = "center",
  className,
  children,
}: {
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={8}
          className={cn(
            "z-[60] rounded-lg border border-surface-border bg-surface p-3 shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
