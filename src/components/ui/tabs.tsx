"use client";

import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Tabs({
  value,
  onValueChange,
  tabs,
  className,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: string; icon?: string }[];
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-surface-border">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-xs font-bold text-on-surface-muted transition-colors",
              "hover:text-primary data-[state=active]:border-primary data-[state=active]:text-primary"
            )}
          >
            {tab.icon && <Icon name={tab.icon} size={16} />}
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
