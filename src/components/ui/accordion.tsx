"use client";

import * as React from "react";
import * as RadixAccordion from "@radix-ui/react-accordion";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Accordion({
  items,
  defaultOpen = [],
  className,
}: {
  items: { value: string; title: string; content: React.ReactNode }[];
  defaultOpen?: string[];
  className?: string;
}) {
  return (
    <RadixAccordion.Root
      type="multiple"
      defaultValue={defaultOpen}
      className={cn("divide-y divide-surface-border", className)}
    >
      {items.map((item) => (
        <RadixAccordion.Item key={item.value} value={item.value}>
          <RadixAccordion.Header>
            <RadixAccordion.Trigger className="group flex w-full items-center justify-between py-3 text-left text-xs font-bold uppercase tracking-wider text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
              {item.title}
              <Icon
                name="expand_more"
                size={18}
                className="text-brand-500 transition-transform group-data-[state=open]:rotate-180"
              />
            </RadixAccordion.Trigger>
          </RadixAccordion.Header>
          <RadixAccordion.Content className="overflow-hidden pb-3 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            {item.content}
          </RadixAccordion.Content>
        </RadixAccordion.Item>
      ))}
    </RadixAccordion.Root>
  );
}
