"use client";

import * as React from "react";
import { Rating } from "@/components/ui/rating";
import { getSellerRatingSummary } from "@/lib/mock-db/reviews";
import type { Seller } from "@/types";

export function SellerRatingSummary({ seller }: { seller: Seller }) {
  const [summary, setSummary] = React.useState({ rating: seller.rating, reviewCount: seller.reviewCount });

  React.useEffect(() => {
    setSummary(getSellerRatingSummary(seller));
  }, [seller]);

  return <Rating value={summary.rating} count={summary.reviewCount} />;
}
