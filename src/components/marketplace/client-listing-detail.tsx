"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { getListingBySlugOverlay, getListingsBySellerOverlay } from "@/lib/mock-db/listings";
import { getSellerByIdOverlay } from "@/lib/mock-db/sellers";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingDetail } from "./listing-detail";
import type { Listing, Seller } from "@/types";

export function ClientListingDetail({ slug }: { slug: string }) {
  const t = useTranslations("marketplace");
  const [state, setState] = React.useState<"loading" | "missing" | "found">("loading");
  const [data, setData] = React.useState<{ listing: Listing; seller: Seller | undefined; otherListings: Listing[] } | null>(
    null
  );

  React.useEffect(() => {
    const listing = getListingBySlugOverlay(slug);
    if (!listing) {
      setState("missing");
      return;
    }
    const seller = getSellerByIdOverlay(listing.sellerId);
    const otherListings = seller
      ? getListingsBySellerOverlay(seller.id, { excludeId: listing.id, limit: 5 })
      : [];
    setData({ listing, seller, otherListings });
    setState("found");
  }, [slug]);

  if (state === "loading") {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-low" />;
  }
  if (state === "missing" || !data) {
    return <EmptyState icon="inventory_2" title={t("storeNotFoundTitle")} body={t("storeNotFoundBody")} />;
  }
  return <ListingDetail listing={data.listing} seller={data.seller} otherListings={data.otherListings} />;
}
