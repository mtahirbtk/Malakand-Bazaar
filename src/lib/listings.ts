import { LISTINGS } from "@/data/fixtures/listings";
import type { Listing } from "@/types";

/**
 * Thin lookup layer over the static fixture — isolates "where listing data
 * comes from" so a future real API swap touches this file, not every page
 * or component that needs a listing.
 */
export function getListingBySlug(slug: string): Listing | undefined {
  return LISTINGS.find((listing) => listing.slug === slug);
}

export function getListingsBySeller(
  sellerId: string,
  options?: { excludeId?: string; limit?: number }
): Listing[] {
  const matches = LISTINGS.filter(
    (listing) => listing.sellerId === sellerId && listing.id !== options?.excludeId
  );
  return options?.limit ? matches.slice(0, options.limit) : matches;
}
