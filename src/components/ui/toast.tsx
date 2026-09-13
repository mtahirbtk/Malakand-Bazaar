"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * The notification system.
 *
 * Five independent Radix Toast stacks — one per corner plus centre — rather
 * than one Viewport with CSS repositioning: Radix ties swipe-to-dismiss,
 * focus return and the screen-reader announcer to a single Provider/Viewport
 * pair, so five toasts anchored at different corners need five pairs. Each
 * only mounts its Viewport while it actually holds a toast.
 */

export type ToastTone = "success" | "error" | "info" | "warning";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";

const DEFAULT_POSITION: ToastPosition = "top-right";
const DEFAULT_DURATION = 4500;

export type ShowOptions = {
  title: string;
  /** Secondary line under the title. Omit for a single-line toast. */
  description?: string;
  tone?: ToastTone;
  position?: ToastPosition;
  /** Milliseconds before it dismisses itself. */
  duration?: number;
};

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  position: ToastPosition;
  duration: number;
};

type ToastContextValue = {
  /** `show("Account created")` for the common case, or the full options object. */
  show: (input: string | ShowOptions, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const POSITIONS: ToastPosition[] = ["top-right", "top-left", "bottom-right", "bottom-left", "center"];

let seq = 0;
function nextId(): string {
  seq += 1;
  return `toast_${seq}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback((input: string | ShowOptions, legacyTone?: ToastTone) => {
    const options: ShowOptions = typeof input === "string" ? { title: input } : input;
    setToasts((prev) => [
      ...prev,
      {
        id: nextId(),
        title: options.title,
        description: options.description,
        tone: options.tone ?? legacyTone ?? "success",
        position: options.position ?? DEFAULT_POSITION,
        duration: options.duration ?? DEFAULT_DURATION,
      },
    ]);
  }, []);

  const value = React.useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {POSITIONS.map((position) => {
        const atPosition = toasts.filter((t) => t.position === position);
        if (atPosition.length === 0) return null;
        return (
          <RadixToast.Provider key={position} swipeDirection={SWIPE_DIRECTION[position]} duration={DEFAULT_DURATION}>
            {atPosition.map((toast) => (
              <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
            <RadixToast.Viewport
              className={cn(
                "fixed z-[100] flex w-80 max-w-[calc(100vw-2rem)] list-none flex-col gap-2 outline-none",
                VIEWPORT_POSITION[position]
              )}
            />
          </RadixToast.Provider>
        );
      })}
    </ToastContext.Provider>
  );
}

/**
 * The site chrome (announcement bar + header + category ribbon, all sticky —
 * see src/app/[locale]/layout.tsx) measures 61+164px on mobile and 47+116px
 * from sm up. A `top-4` toast sits underneath it, so the "top" positions
 * clear it with margin instead. If the chrome's height changes, remeasure
 * (`document.querySelector("header").getBoundingClientRect()` plus the
 * announcement bar above it) and update these two values together.
 */
const CLEAR_CHROME = "top-[248px] sm:top-[180px]";

const VIEWPORT_POSITION: Record<ToastPosition, string> = {
  "top-right": cn(CLEAR_CHROME, "right-4 items-end"),
  "top-left": cn(CLEAR_CHROME, "left-4 items-start"),
  "bottom-right": "bottom-4 right-4 flex-col-reverse items-end",
  "bottom-left": "bottom-4 left-4 flex-col-reverse items-start",
  center: cn(CLEAR_CHROME, "left-1/2 -translate-x-1/2 items-center"),
};

const SWIPE_DIRECTION: Record<ToastPosition, "left" | "right" | "up" | "down"> = {
  "top-right": "right",
  "bottom-right": "right",
  "top-left": "left",
  "bottom-left": "left",
  center: "up",
};

/**
 * Enter/exit direction matches the corner the toast lives in — a toast from
 * the top-left visibly arrives from the left, not generically "from above".
 * `animate-in`/`animate-out` and the swipe-translate utilities come from
 * tailwindcss-animate, keyed off Radix's `data-state`/`data-swipe` attributes.
 */
const MOTION: Record<ToastPosition, string> = {
  "top-right": cn(
    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
  ),
  "bottom-right": cn(
    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
  ),
  "top-left": cn(
    "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
  ),
  "bottom-left": cn(
    "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
  ),
  center: cn(
    "data-[state=open]:slide-in-from-top data-[state=open]:fade-in",
    "data-[state=closed]:slide-out-to-top data-[state=closed]:fade-out",
    "data-[swipe=move]:-translate-y-[var(--radix-toast-swipe-move-y)]",
    "data-[swipe=cancel]:translate-y-0 data-[swipe=end]:-translate-y-[var(--radix-toast-swipe-end-y)]"
  ),
};

const TONE_ICON: Record<ToastTone, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};

/**
 * Tones from docs/palette.md's roles rather than the raw ramp: brand-700 for
 * success (emphasis, not the reserved brand-800), the sand family's dark
 * variant for warning (the only sand tone that passes white-on-fill), and
 * `secondary` for info so it reads calmer than success without borrowing red.
 */
const TONE_STYLE: Record<ToastTone, string> = {
  success: "bg-brand-700 text-white",
  error: "bg-danger text-white",
  info: "bg-secondary text-white",
  warning: "bg-tertiary-dark text-white",
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <RadixToast.Root
      duration={toast.duration}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-2.5 rounded-lg px-4 py-3 shadow-floating",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
        "data-[state=closed]:duration-200 data-[state=open]:duration-300",
        TONE_STYLE[toast.tone],
        MOTION[toast.position]
      )}
    >
      <Icon name={TONE_ICON[toast.tone]} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <RadixToast.Title className="block text-xs font-extrabold leading-snug">
          {toast.title}
        </RadixToast.Title>
        {toast.description && (
          <RadixToast.Description className="mt-0.5 block text-[11px] font-medium leading-snug opacity-90">
            {toast.description}
          </RadixToast.Description>
        )}
      </div>
      <RadixToast.Close aria-label="Dismiss notification" className="shrink-0 opacity-80 transition-opacity hover:opacity-100">
        <Icon name="close" size={16} />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
