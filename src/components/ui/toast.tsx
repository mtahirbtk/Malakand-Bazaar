"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type Tone = "success" | "error";
type ToastState = { message: string; tone: Tone } | null;

const ToastContext = React.createContext<{
  show: (message: string, tone?: Tone) => void;
}>({ show: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState>(null);

  const show = React.useCallback((message: string, tone: Tone = "success") => {
    setToast({ message, tone });
  }, []);

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        <RadixToast.Root
          open={toast !== null}
          onOpenChange={(open) => !open && setToast(null)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-bold text-white shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            toast?.tone === "error" ? "bg-danger" : "bg-brand-700"
          )}
        >
          <Icon name={toast?.tone === "error" ? "error" : "check_circle"} size={18} />
          <RadixToast.Title>{toast?.message}</RadixToast.Title>
        </RadixToast.Root>
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
