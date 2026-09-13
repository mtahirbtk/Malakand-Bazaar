"use client";

import * as React from "react";
import { readCsrfToken } from "@/lib/api-client";

/**
 * Fires the +1 view ping once per mount (§5). `keepalive: true` lets the
 * request finish even if the visitor navigates away immediately, and nothing
 * here awaits it or touches render — a failed or blocked ping never affects
 * the page. Renders no DOM.
 */
export function ListingViewPing({ listingId }: { listingId: string }) {
  React.useEffect(() => {
    const csrf = readCsrfToken();
    void fetch(`/api/listings/${listingId}/view`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: csrf ? { "x-csrf-token": csrf } : undefined,
    }).catch(() => {
      // Best-effort: an ad blocker or offline visitor just means one uncounted view.
    });
  }, [listingId]);

  return null;
}
