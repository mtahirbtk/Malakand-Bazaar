"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Placed on the listing detail page next to PhoneReveal — deliberately not
 * on ListingCard (see that component's own doc comment: "no buttons on the
 * card ... no save", by design).
 *
 * Always starts unsaved, even if the listing is already in the viewer's
 * favourites — see Task 13's plan ruling: wiring an `initiallySaved` prop
 * through the (Server Component) listing detail page would mean a per-viewer
 * DB read on every visit for a cosmetic gap (button reads "Save" instead of
 * "Saved" until clicked once). Out of scope; the save endpoint is idempotent.
 */
export function SaveListingButton({ listingId, className }: { listingId: string; className?: string }) {
  const t = useTranslations("marketplace");
  const { user } = useAuth();
  const { show } = useToast();
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  if (!user) return null; // signed-out visitors get no save affordance, matching SellerReviews' sign-in gate

  async function toggle() {
    setPending(true);
    const next = !saved;
    setSaved(next); // optimistic; reverted on failure below
    try {
      if (next) await api.post("/api/me/favorites", { listingId });
      else await api.delete(`/api/me/favorites/${listingId}`);
    } catch (err) {
      setSaved(!next);
      show({ title: err instanceof ApiClientError ? err.message : t("saveListing"), tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t("unsaveListing") : t("saveListing")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-xs font-bold transition-colors",
        saved ? "border-brand-600 bg-brand-50 text-brand-700" : "border-surface-border bg-surface text-on-surface hover:bg-brand-50",
        className
      )}
    >
      <Icon name="bookmark" size={16} filled={saved} />
      {saved ? t("savedCta") : t("saveListing")}
    </button>
  );
}
