import "server-only";
import { rpc } from "../db";
import { toListing, type ListingItemRow } from "./listings";
import { initialsFromName } from "@/lib/seller-display";
import type { Listing, Seller, TehsilSlug } from "@/types";

/**
 * The homepage (§2.3 #25, §6.3). One RPC — `fn_home_payload` — already does
 * every gating decision (which shelves clear the listing-count threshold,
 * whether trending/top-sellers have enough data to be honest); this layer
 * only reshapes rows into the types the front end's shelf/card components
 * already render.
 */

export type CategoryShelf = {
  categorySlug: string;
  categoryName: string;
  items: Listing[];
};

export type HomePayload = {
  readiness: { showTrending: boolean; showTopSellers: boolean };
  shelves: CategoryShelf[];
  trending: Listing[];
  topSellers: Seller[];
  counters: { totalActiveListings: number; totalSellers: number };
};

type HomeSellerRow = {
  id: string;
  slug: string;
  name: string;
  tehsilSlug: string | null;
  localityLabel: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  responseMinutes: number;
  listingCount: number;
  phone: string;
};

type HomePayloadRow = {
  readiness: HomePayload["readiness"];
  shelves: { categorySlug: string; categoryName: string; items: ListingItemRow[] }[];
  trending: ListingItemRow[];
  topSellers: HomeSellerRow[];
  counters: HomePayload["counters"];
};

function toSeller(row: HomeSellerRow): Seller {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    initials: initialsFromName(row.name),
    tehsilSlug: (row.tehsilSlug ?? "") as TehsilSlug,
    localityLabel: row.localityLabel ?? "",
    rating: Number(row.ratingAvg),
    reviewCount: row.ratingCount,
    verified: row.verified,
    responseMinutes: row.responseMinutes,
    listingCount: row.listingCount,
    phone: row.phone,
  };
}

export async function getHomePayload(): Promise<HomePayload> {
  const row = await rpc<HomePayloadRow>("fn_home_payload");

  return {
    readiness: row.readiness,
    shelves: row.shelves.map((shelf) => ({
      categorySlug: shelf.categorySlug,
      categoryName: shelf.categoryName,
      items: shelf.items.map(toListing),
    })),
    trending: row.trending.map(toListing),
    topSellers: row.topSellers.map(toSeller),
    counters: row.counters,
  };
}
