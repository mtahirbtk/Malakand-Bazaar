"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const sides = {
  left: "inset-y-0 left-0 h-full w-[85%] max-w-sm data-[state=open]:slide-in-from-left",
  right:
    "inset-y-0 right-0 h-full w-[85%] max-w-sm data-[state=open]:slide-in-from-right",
  bottom:
    "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl data-[state=open]:slide-in-from-bottom",
};

export function Drawer({
  open,
  onOpenChange,
  title,
  side = "left",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: keyof typeof sides;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-on-surface/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed z-[80] overflow-y-auto bg-surface shadow-floating data-[state=open]:animate-in",
            sides[side]
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3">
            <Dialog.Title className="text-sm font-bold uppercase tracking-wider text-brand-700">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded-lg p-1 text-on-surface-muted hover:bg-brand-50 hover:text-brand-700"
            >
              <Icon name="close" size={20} />
            </Dialog.Close>
          </div>
          <div className="p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
