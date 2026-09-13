import "server-only";
import { db, PG } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { publicStorageUrl } from "../storage";
import { assertOwnCommittedListingUpload, attachListingImage, deleteStorageObjects } from "./uploads";
import { resolveLocality } from "./sellers";
import { toListing, type ListingItemRow } from "./listings";
import type {
  CreateListingInput,
  ListingStatusValue,
  SellerListingsQuery,
  UpdateListingInput,
} from "../schemas/seller";
import type { Listing, ListingImage } from "@/types";

/**
 * The seller's own view of their listings — create, edit, status, images.
 * Every function here takes `sellerId` from `requireSeller()`, never from the
 * request body, and every query carries `seller_id = $sellerId` in its WHERE
 * clause per docs/backend-plan.md §3.3: ownership is enforced in SQL, not by
 * a forgotten `if` in a handler.
 */

const LISTING_ROW_COLUMNS =
  "id, slug, title, description, price, compare_at_price, category_slug, subcategory_slug, tehsil_slug, locality_slug, locality_label, coordinates, contact_phone, seller_id, status, moderation_status, view_count, created_at";

type ListingRow = {
  id: string; slug: string; title: string; description: string; price: number;
  compare_at_price: number | null; category_slug: string; subcategory_slug: string | null;
  tehsil_slug: string | null; locality_slug: string | null; locality_label: string | null;
  coordinates: { lat: number; lng: number } | null; contact_phone: string; seller_id: string;
  status: Listing["status"]; moderation_status: "pending" | "approved" | "rejected";
  view_count: number; created_at: string;
};

function rowToItem(row: ListingRow, images: string[] = []): ListingItemRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    categorySlug: row.category_slug,
    subcategorySlug: row.subcategory_slug,
    tehsilSlug: row.tehsil_slug,
    localitySlug: row.locality_slug,
    localityLabel: row.locality_label,
    images,
    contactPhone: row.contact_phone,
    sellerId: row.seller_id,
    status: row.status,
    createdAt: row.created_at,
    coordinates: row.coordinates,
  };
}

export type SellerListingRow = Listing & { moderationStatus: ListingRow["moderation_status"]; viewCount: number };

function toSellerListing(row: ListingRow, images: string[]): SellerListingRow {
  return { ...toListing(rowToItem(row, images)), moderationStatus: row.moderation_status, viewCount: row.view_count };
}

async function imagesForListings(listingIds: string[]): Promise<Map<string, string[]>> {
  if (listingIds.length === 0) return new Map();
  const { data } = await db
    .from("listing_images")
    .select("listing_id, path, sort")
    .in("listing_id", listingIds)
    .order("sort", { ascending: true });

  // Raw paths, not URLs: toSellerListing() runs them through toListing(),
  // which is the one place that maps a path to a public URL — doing it here
  // too would double-prefix it.
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.listing_id) ?? [];
    list.push(row.path);
    map.set(row.listing_id, list);
  }
  return map;
}

export type SellerListingsResult = { items: SellerListingRow[]; total: number; page: number; limit: number };

export async function listSellerListings(sellerId: string, query: SellerListingsQuery): Promise<SellerListingsResult> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  let builder = db
    .from("listings")
    .select(LISTING_ROW_COLUMNS, { count: "exact" })
    .eq("seller_id", sellerId)
    .is("deleted_at", null);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.q) builder = builder.ilike("title", `%${query.q}%`);

  const [column, ascending] = (
    {
      newest: ["created_at", false],
      oldest: ["created_at", true],
      price_low: ["price", true],
      price_high: ["price", false],
      views: ["view_count", false],
    } as const
  )[query.sort];

  const { data, error, count } = await builder.order(column, { ascending }).range(from, to);
  if (error) {
    log.error("listSellerListings failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your listings. Please try again.");
  }

  const rows = (data ?? []) as ListingRow[];
  const imageMap = await imagesForListings(rows.map((r) => r.id));

  return {
    items: rows.map((row) => toSellerListing(row, imageMap.get(row.id) ?? [])),
    total: count ?? 0,
    page,
    limit: query.limit,
  };
}

/** The edit form needs image ids (for reorder/delete-by-id), not just URLs. */
export type SellerListingDetail = SellerListingRow & { imageDetails: ListingImage[] };

export async function getOwnListingById(sellerId: string, listingId: string): Promise<SellerListingDetail> {
  const { data } = await db
    .from("listings")
    .select(LISTING_ROW_COLUMNS)
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null)
    .maybeSingle();

  // 404, not 403, on a mismatch — see assertOwnership's doc comment.
  if (!data) throw ApiError.notFound("That listing");

  const { data: imageRows } = await db
    .from("listing_images")
    .select("id, path, width, height, sort")
    .eq("listing_id", listingId)
    .order("sort", { ascending: true });

  const imageDetails: ListingImage[] = (imageRows ?? []).map((row) => ({
    id: row.id,
    url: publicStorageUrl(row.path),
    width: row.width,
    height: row.height,
    sort: row.sort,
  }));

  return {
    ...toSellerListing(data as ListingRow, (imageRows ?? []).map((row) => row.path)),
    imageDetails,
  };
}

async function isModerationRequired(): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "moderation.require_approval").maybeSingle();
  return data?.value === true;
}

function translateWriteError(error: { code?: string; message: string }, context: Record<string, unknown>): never {
  if (error.code === PG.RAISE_EXCEPTION) {
    // fn_listings_category_chk (migration 0004): a subcategory that doesn't
    // belong to the given category, or a category used as a subcategory.
    throw ApiError.validation("Choose a category and subcategory that match.", {
      subcategorySlug: "Choose a category and subcategory that match.",
    });
  }
  if (error.code === PG.FOREIGN_KEY_VIOLATION) {
    throw ApiError.validation("Choose a valid category and location.");
  }
  log.error("listing write failed", { ...context, code: error.code, message: error.message });
  throw new ApiError("INTERNAL", "Could not save the listing. Please try again.");
}

export async function createListing(sellerId: string, input: CreateListingInput): Promise<SellerListingRow> {
  // Validated before the insert, not after: discovering a bad path only once
  // attachListingImage runs would leave a real listing row behind while the
  // client is told creation failed.
  for (const path of input.images) {
    await assertOwnCommittedListingUpload(sellerId, path);
  }

  const localityLabel = await resolveLocality(input.tehsilSlug, input.localitySlug);
  const moderationStatus = (await isModerationRequired()) ? "pending" : "approved";

  const { data: slugRow, error: slugError } = await db.rpc("fn_unique_listing_slug", { p_title: input.title });
  if (slugError) throw new ApiError("INTERNAL", "Could not create the listing. Please try again.");

  const { data, error } = await db
    .from("listings")
    .insert({
      slug: slugRow as unknown as string,
      seller_id: sellerId,
      title: input.title,
      description: input.description,
      price: input.price,
      compare_at_price: input.compareAtPrice ?? null,
      category_slug: input.categorySlug,
      subcategory_slug: input.subcategorySlug || null,
      tehsil_slug: input.tehsilSlug,
      locality_slug: input.localitySlug,
      locality_label: localityLabel,
      coordinates: input.coordinates
        ? `SRID=4326;POINT(${input.coordinates.lng} ${input.coordinates.lat})`
        : null,
      contact_phone: input.contactPhone,
      moderation_status: moderationStatus,
    })
    .select(LISTING_ROW_COLUMNS)
    .single();

  if (error) translateWriteError(error, { sellerId, title: input.title });

  const listing = data as ListingRow;
  for (const path of input.images) {
    await attachListingImage(sellerId, listing.id, path);
  }

  log.info("listing created", { sellerId, listingId: listing.id });
  const imageMap = await imagesForListings([listing.id]);
  return toSellerListing(listing, imageMap.get(listing.id) ?? []);
}

/** True when a change to any of these fields is material enough to re-enter moderation. */
function isMaterialChange(current: ListingRow, input: UpdateListingInput): boolean {
  return (
    (input.title !== undefined && input.title !== current.title) ||
    (input.description !== undefined && input.description !== current.description) ||
    (input.price !== undefined && Number(input.price) !== Number(current.price))
  );
}

export async function updateListing(
  sellerId: string,
  listingId: string,
  input: UpdateListingInput
): Promise<SellerListingRow> {
  const { data: existing } = await db
    .from("listings")
    .select(LISTING_ROW_COLUMNS)
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) throw ApiError.notFound("That listing");

  const current = existing as ListingRow;
  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = input.price;
  if (input.compareAtPrice !== undefined) patch.compare_at_price = input.compareAtPrice;
  if (input.categorySlug !== undefined) patch.category_slug = input.categorySlug;
  if (input.subcategorySlug !== undefined) patch.subcategory_slug = input.subcategorySlug || null;
  if (input.contactPhone !== undefined) patch.contact_phone = input.contactPhone;
  if (input.coordinates !== undefined) {
    patch.coordinates = `SRID=4326;POINT(${input.coordinates.lng} ${input.coordinates.lat})`;
  }

  if (input.tehsilSlug !== undefined && input.localitySlug !== undefined) {
    patch.locality_label = await resolveLocality(input.tehsilSlug, input.localitySlug);
    patch.tehsil_slug = input.tehsilSlug;
    patch.locality_slug = input.localitySlug;
  }

  if ((await isModerationRequired()) && isMaterialChange(current, input)) {
    patch.moderation_status = "pending";
    patch.rejection_reason = null;
  }

  const { data, error } = await db
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .select(LISTING_ROW_COLUMNS)
    .single();

  if (error) translateWriteError(error, { sellerId, listingId });

  log.info("listing updated", { sellerId, listingId });
  const imageMap = await imagesForListings([listingId]);
  return toSellerListing(data as ListingRow, imageMap.get(listingId) ?? []);
}

/**
 * Legal transitions. `removed` is terminal from this endpoint — undoing a
 * takedown is an admin action (Phase 8), out of scope here.
 */
const LEGAL_TRANSITIONS: Record<ListingStatusValue, ListingStatusValue[]> = {
  active: ["active", "reserved", "sold", "removed"],
  reserved: ["reserved", "active", "sold", "removed"],
  sold: ["sold", "active", "reserved", "removed"],
  removed: ["removed"],
};

export async function updateListingStatus(
  sellerId: string,
  listingId: string,
  status: ListingStatusValue
): Promise<SellerListingRow> {
  const { data: existing } = await db
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) throw ApiError.notFound("That listing");

  if (!LEGAL_TRANSITIONS[existing.status as ListingStatusValue].includes(status)) {
    throw ApiError.conflict(`Cannot change a "${existing.status}" listing to "${status}".`);
  }

  const { data, error } = await db
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .select(LISTING_ROW_COLUMNS)
    .single();

  if (error) translateWriteError(error, { sellerId, listingId, status });

  const imageMap = await imagesForListings([listingId]);
  return toSellerListing(data as ListingRow, imageMap.get(listingId) ?? []);
}

/** DELETE /api/seller/listings/:id — soft delete: removed + deleted_at, keeps analytics history. */
export async function softDeleteListing(sellerId: string, listingId: string): Promise<void> {
  const { data, error } = await db
    .from("listings")
    .update({ status: "removed", deleted_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) translateWriteError(error, { sellerId, listingId });
  if (!data) throw ApiError.notFound("That listing");

  log.info("listing soft-deleted", { sellerId, listingId });
}

async function assertOwnListing(sellerId: string, listingId: string): Promise<void> {
  const { data } = await db.from("listings").select("id").eq("id", listingId).eq("seller_id", sellerId).maybeSingle();
  if (!data) throw ApiError.notFound("That listing");
}

export async function reorderListingImages(sellerId: string, listingId: string, ids: string[]): Promise<ListingImage[]> {
  await assertOwnListing(sellerId, listingId);

  const { data: existing, error: fetchError } = await db
    .from("listing_images")
    .select("id, path, width, height")
    .eq("listing_id", listingId);
  if (fetchError) throw new ApiError("INTERNAL", "Could not reorder photos. Please try again.");

  const byId = new Map((existing ?? []).map((row) => [row.id as string, row]));
  if (ids.length !== byId.size || !ids.every((id) => byId.has(id))) {
    throw ApiError.validation("That photo order does not match this listing's photos.");
  }

  for (const [sort, id] of ids.entries()) {
    const { error } = await db.from("listing_images").update({ sort }).eq("id", id);
    if (error) {
      log.error("listing image reorder failed", { listingId, imageId: id, message: error.message });
      throw new ApiError("INTERNAL", "Could not reorder photos. Please try again.");
    }
  }

  return ids.map((id, sort) => {
    const row = byId.get(id)!;
    return { id, url: publicStorageUrl(row.path), width: row.width, height: row.height, sort };
  });
}

export async function deleteListingImage(sellerId: string, listingId: string, imageId: string): Promise<void> {
  await assertOwnListing(sellerId, listingId);

  const { data, error: deleteError } = await db
    .from("listing_images")
    .delete()
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .select("path")
    .maybeSingle();

  if (deleteError) throw new ApiError("INTERNAL", "Could not remove that photo. Please try again.");
  if (!data) throw ApiError.notFound("That photo");

  await deleteStorageObjects([data.path]);
}
