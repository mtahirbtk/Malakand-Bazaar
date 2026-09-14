"use client";

import * as React from "react";

/**
 * Cloudflare Turnstile.
 *
 * With no email confirmation and no SMS (docs/decisions.md), this is the only
 * thing standing between the signup endpoint and a script. It renders nothing
 * when no site key is configured, so local work and tests need no Cloudflare
 * account — the server skips verification under the same condition, so the two
 * halves cannot disagree.
 *
 * The widget solves itself for a normal visitor; there is no puzzle to click.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
          language?: string;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function turnstileEnabled(): boolean {
  return Boolean(TURNSTILE_SITE_KEY);
}

export function TurnstileWidget({
  onToken,
  locale,
  className,
}: {
  /** Called with a fresh token, and with null when one expires or errors. */
  onToken: (token: string | null) => void;
  locale?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const widgetId = React.useRef<string | null>(null);
  const callback = React.useRef(onToken);
  callback.current = onToken;

  React.useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
          theme: "light",
          size: "flexible",
          language: locale === "ur" ? "ur" : "en",
        });
      })
      .catch(() => {
        // The server fails closed on a missing token, so the user sees a clear
        // message from the submit rather than a silent dead end here.
        callback.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          // Already gone — nothing to clean up.
        }
      }
    };
  }, [locale]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className={className} />;
}
