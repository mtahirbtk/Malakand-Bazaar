import "server-only";
import { db, rpc } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { cloudinaryUrl } from "../storage";
import type { Listing, ListingSellerCard } from "@/types";
import type { SearchListingsQuery } from "../schemas/listings";
import type { PublicSellerListingsQuery } from "../schemas/public-seller-listings";

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
    images: row.images.map(cloudinaryUrl),
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

const SELLER_LISTING_COLUMNS =
  "id, slug, title, description, price, compare_at_price, category_slug, subcategory_slug, tehsil_slug, locality_slug, locality_label, coordinates, contact_phone, seller_id, status, created_at";

type PlainListingRow = {
  id: string; slug: string; title: string; description: string; price: number;
  compare_at_price: number | null; category_slug: string; subcategory_slug: string | null;
  tehsil_slug: string | null; locality_slug: string | null; locality_label: string | null;
  coordinates: { lat: number; lng: number } | null; contact_phone: string; seller_id: string;
  status: Listing["status"]; created_at: string;
};

function plainRowToItem(row: PlainListingRow, images: string[]): ListingItemRow {
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description, price: row.price,
    compareAtPrice: row.compare_at_price, categorySlug: row.category_slug,
    subcategorySlug: row.subcategory_slug, tehsilSlug: row.tehsil_slug, localitySlug: row.locality_slug,
    localityLabel: row.locality_label, images, contactPhone: row.contact_phone, sellerId: row.seller_id,
    status: row.status, createdAt: row.created_at, coordinates: row.coordinates,
  };
}

async function imagesFor(listingIds: string[]): Promise<Map<string, string[]>> {
  if (listingIds.length === 0) return new Map();
  const { data } = await db.from("listing_images").select("listing_id, path, sort").in("listing_id", listingIds).order("sort", { ascending: true });
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.listing_id) ?? [];
    list.push(row.path);
    map.set(row.listing_id, list);
  }
  return map;
}

/**
 * `/seller/[slug]` listings tab — §2.4 #28. A plain paginated read scoped to
 * one seller, `moderation_status = 'approved'` and `deleted_at is null`
 * always (a buyer never sees a pending or removed listing here regardless of
 * `status`).
 */
export async function listPublicSellerListings(
  sellerId: string,
  query: PublicSellerListingsQuery
): Promise<{ items: Listing[]; total: number }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  const [column, ascending] = (
    { newest: ["created_at", false], price_low: ["price", true], price_high: ["price", false] } as const
  )[query.sort];

  const { data, error, count } = await db
    .from("listings")
    .select(SELLER_LISTING_COLUMNS, { count: "exact" })
    .eq("seller_id", sellerId)
    .eq("status", query.status)
    .eq("moderation_status", "approved")
    .is("deleted_at", null)
    .order(column, { ascending })
    .range(from, to);

  if (error) {
    log.error("listPublicSellerListings failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load this seller's listings. Please try again.");
  }

  const rows = (data ?? []) as PlainListingRow[];
  const images = await imagesFor(rows.map((r) => r.id));
  return { items: rows.map((row) => toListing(plainRowToItem(row, images.get(row.id) ?? []))), total: count ?? 0 };
}
