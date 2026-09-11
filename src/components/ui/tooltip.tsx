"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <RadixTooltip.Root delayDuration={250}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-[90] rounded-md bg-on-surface px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-floating data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          {label}
          <RadixTooltip.Arrow className="fill-on-surface" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
