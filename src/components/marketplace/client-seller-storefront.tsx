"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { getSellerBySlugOverlay } from "@/lib/mock-db/sellers";
import { getListingsBySellerOverlay } from "@/lib/mock-db/listings";
import { EmptyState } from "@/components/ui/empty-state";
import { SellerStorefront } from "./seller-storefront";
import type { Seller, Listing } from "@/types";

export function ClientSellerStorefront({ slug }: { slug: string }) {
  const t = useTranslations("marketplace");
  const [state, setState] = React.useState<"loading" | "missing" | "found">("loading");
  const [data, setData] = React.useState<{ seller: Seller; listings: Listing[] } | null>(null);

  React.useEffect(() => {
    const seller = getSellerBySlugOverlay(slug);
    if (!seller) {
      setState("missing");
      return;
    }
    setData({ seller, listings: getListingsBySellerOverlay(seller.id) });
    setState("found");
  }, [slug]);

  if (state === "loading") {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-low" />;
  }
  if (state === "missing" || !data) {
    return <EmptyState icon="storefront" title={t("storeNotFoundTitle")} body={t("storeNotFoundBody")} />;
  }
  return <SellerStorefront seller={data.seller} listings={data.listings} />;
}
