"use client";

import Swal, { type SweetAlertIcon, type SweetAlertPosition } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/**
 * Notifications, powered directly by SweetAlert2's own toast mixin — the
 * recipe from their docs (https://sweetalert2.github.io/#toasts), unmodified:
 * `toast: true`, no confirm button, a timer with its progress bar, paused on
 * hover. No custom CSS, animation or positioning on top of it.
 */

export type ToastTone = "success" | "error" | "info" | "warning";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";

export type ShowOptions = {
  title: string;
  /** Secondary line under the title. Omit for a single-line toast. */
  description?: string;
  tone?: ToastTone;
  position?: ToastPosition;
  /** Milliseconds before it dismisses itself. */
  duration?: number;
};

const DEFAULT_POSITION: ToastPosition = "top-right";
const DEFAULT_DURATION = 3000;

const POSITION_MAP: Record<ToastPosition, SweetAlertPosition> = {
  "top-right": "top-end",
  "top-left": "top-start",
  "bottom-right": "bottom-end",
  "bottom-left": "bottom-start",
  center: "center",
};

const toastMixin = Swal.mixin({
  toast: true,
  showConfirmButton: false,
  timerProgressBar: true,
  didOpen: (el) => {
    el.onmouseenter = Swal.stopTimer;
    el.onmouseleave = Swal.resumeTimer;
  },
});

function show(input: string | ShowOptions, legacyTone?: ToastTone): void {
  const options: ShowOptions = typeof input === "string" ? { title: input } : input;
  void toastMixin.fire({
    title: options.title,
    text: options.description,
    icon: (options.tone ?? legacyTone ?? "success") satisfies SweetAlertIcon,
    position: POSITION_MAP[options.position ?? DEFAULT_POSITION],
    timer: options.duration ?? DEFAULT_DURATION,
  });
}

/**
 * SweetAlert2 is imperative and needs no provider or portal — kept only so
 * every call site can still write `useToast()` without caring how the toast
 * is actually rendered.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useToast(): { show: typeof show } {
  return { show };
}
