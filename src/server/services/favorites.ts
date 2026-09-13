import "server-only";
import { db } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { getListingsByIds } from "./listings";
import type { Listing } from "@/types";

/** Saved listings — §2.6 #35-37. */

export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const { data: listing, error: lookupError } = await db
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (lookupError) {
    log.error("addFavorite lookup failed", { userId, listingId, message: lookupError.message });
    throw new ApiError("INTERNAL", "Could not save this listing. Please try again.");
  }
  if (!listing) throw ApiError.notFound("That listing");

  // Idempotent per §2.6 #36: a repeat POST is not an error.
  const { error } = await db
    .from("favorites")
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });

  if (error) {
    log.error("addFavorite failed", { userId, listingId, message: error.message });
    throw new ApiError("INTERNAL", "Could not save this listing. Please try again.");
  }
}

export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  const { error } = await db.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId);
  if (error) {
    log.error("removeFavorite failed", { userId, listingId, message: error.message });
    throw new ApiError("INTERNAL", "Could not remove this listing. Please try again.");
  }
}

export async function listFavorites(
  userId: string,
  pagination: { limit: number; page?: number }
): Promise<{ items: Listing[]; total: number }> {
  const page = pagination.page ?? 1;
  const from = (page - 1) * pagination.limit;
  const to = from + pagination.limit - 1;

  const { data, error, count } = await db
    .from("favorites")
    .select("listing_id", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("listFavorites failed", { userId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your saved listings. Please try again.");
  }

  const ids = (data ?? []).map((r) => r.listing_id);
  const listings = await getListingsByIds(ids);
  const byId = new Map(listings.map((l) => [l.id, l]));
  // getListingsByIds drops soft-deleted rows; filter(Boolean) then restores
  // the favorites list's own recency order, which the `in()` fetch does not
  // preserve.
  const items = ids.map((id) => byId.get(id)).filter((l): l is Listing => l !== undefined);

  return { items, total: count ?? 0 };
}
