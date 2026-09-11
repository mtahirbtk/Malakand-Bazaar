"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type MenuItem = {
  label: string;
  icon?: string;
  onSelect?: () => void;
  href?: string;
};

export function DropdownMenu({
  trigger,
  items,
  ariaLabel,
  align = "start",
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  ariaLabel: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          aria-label={ariaLabel}
          align={align}
          sideOffset={4}
          className="z-[60] min-w-56 overflow-hidden rounded-lg border border-surface-border bg-surface p-1 shadow-floating data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.label}
              onSelect={item.onSelect}
              asChild={Boolean(item.href)}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-2 text-xs font-semibold text-on-surface outline-none",
                "data-[highlighted]:bg-surface-low data-[highlighted]:text-primary"
              )}
            >
              {item.href ? (
                <a href={item.href}>
                  {item.icon && <Icon name={item.icon} size={16} />}
                  {item.label}
                </a>
              ) : (
                <>
                  {item.icon && <Icon name={item.icon} size={16} />}
                  {item.label}
                </>
              )}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
