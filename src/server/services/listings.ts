import "server-only";
import { rpc } from "../db";
import { publicStorageUrl } from "../storage";
import type { Listing, ListingSellerCard } from "@/types";
import type { SearchListingsQuery } from "../schemas/listings";

/**
 * Listings read layer — GET /api/listings and the listing detail page.
 *
 * Every DB function here (`fn_search_listings`, `fn_get_listing_by_slug`,
 * `fn_related_listings`, `fn_seller_other_listings`, `fn_suggest_listings`,
 * migrations 0011–0013) already returns the item in a shape close to the
 * front end's `Listing` type — camelCase, ready to hand to `ListingCard`.
 * This layer's job is narrow: turn nullable DB columns into the optional
 * fields `Listing` expects, and turn storage paths into fetchable URLs.
 */

export type ListingItemRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categorySlug: string;
  subcategorySlug: string | null;
  tehsilSlug: string | null;
  localitySlug: string | null;
  localityLabel: string | null;
  images: string[];
  contactPhone: string;
  sellerId: string;
  status: Listing["status"];
  createdAt: string;
  coordinates: { lat: number; lng: number } | null;
};

export function toListing(row: ListingItemRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compareAtPrice === null ? undefined : Number(row.compareAtPrice),
    categorySlug: row.categorySlug,
    // Non-null in the DB (fn checks aside) for every real listing; "" only
    // shows up for hand-crafted rows that skip it, and renders as an absent
    // filter rather than a crash.
    subcategorySlug: row.subcategorySlug ?? "",
    tehsilSlug: (row.tehsilSlug ?? "") as Listing["tehsilSlug"],
    localitySlug: row.localitySlug ?? "",
    localityLabel: row.localityLabel ?? "",
    images: row.images.map(publicStorageUrl),
    contactPhone: row.contactPhone,
    sellerId: row.sellerId,
    status: row.status,
    createdAt: row.createdAt,
    coordinates: row.coordinates ?? undefined,
  };
}

export type SearchListingsResult = {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  facets: {
    category: Record<string, number>;
    tehsil: Record<string, number>;
    minPrice: number | null;
    maxPrice: number | null;
  };
};

type SearchListingsRpcResult = {
  items: ListingItemRow[];
  total: number;
  page: number;
  limit: number;
  facets: SearchListingsResult["facets"];
};

export async function searchListings(query: SearchListingsQuery): Promise<SearchListingsResult> {
  const result = await rpc<SearchListingsRpcResult>("fn_search_listings", {
    p_q: query.q ?? null,
    p_category: query.category ?? null,
    p_subcategory: query.subcategory ?? null,
    p_tehsils: query.tehsil ?? null,
    p_locality: query.locality ?? null,
    p_min_price: query.minPrice ?? null,
    p_max_price: query.maxPrice ?? null,
    p_verified_only: query.verifiedOnly,
    p_availability: query.availability,
    p_seller_id: query.sellerId ?? null,
    p_sort: query.sort,
    p_page: query.page ?? 1,
    p_limit: query.limit,
  });

  return { ...result, items: result.items.map(toListing) };
}

export async function suggestListings(q: string, limit: number) {
  const rows = await rpc<{ slug: string; title: string; categorySlug: string }[]>(
    "fn_suggest_listings",
    { p_q: q, p_limit: limit }
  );
  return rows;
}

type ListingDetailRow = {
  listing: ListingItemRow;
  seller: {
    id: string;
    slug: string;
    name: string;
    phone: string;
    tehsilSlug: string | null;
    localityLabel: string | null;
    coordinates: { lat: number; lng: number } | null;
    avatarPath: string | null;
    bannerPath: string | null;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
    responseMinutes: number;
    listingCount: number;
  };
};

export type ListingDetail = { listing: Listing; seller: ListingSellerCard };

export async function getListingBySlug(slug: string): Promise<ListingDetail | null> {
  const row = await rpc<ListingDetailRow | null>("fn_get_listing_by_slug", { p_slug: slug });
  if (!row) return null;

  return {
    listing: toListing(row.listing),
    seller: {
      slug: row.seller.slug,
      name: row.seller.name,
      coordinates: row.seller.coordinates ?? undefined,
    },
  };
}

export async function getRelatedListings(listingId: string, limit = 6): Promise<Listing[]> {
  const rows = await rpc<ListingItemRow[]>("fn_related_listings", {
    p_listing_id: listingId,
    p_limit: limit,
  });
  return rows.map(toListing);
}

/** §5: one counter increment, nothing about the viewer stored. */
export async function bumpView(listingId: string): Promise<void> {
  await rpc<void>("fn_bump_view", { p_listing_id: listingId });
}

export async function bumpContact(listingId: string, channel: "whatsapp" | "call" | "copy"): Promise<void> {
  await rpc<void>("fn_bump_contact", { p_listing_id: listingId, p_channel: channel });
}

export async function getSellerOtherListings(
  sellerId: string,
  excludeId: string,
  limit = 5
): Promise<Listing[]> {
  const rows = await rpc<ListingItemRow[]>("fn_seller_other_listings", {
    p_seller_id: sellerId,
    p_exclude_id: excludeId,
    p_limit: limit,
  });
  return rows.map(toListing);
}
