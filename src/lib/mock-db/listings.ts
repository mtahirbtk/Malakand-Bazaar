import { LISTINGS } from "@/data/fixtures/listings";
import { readStore, writeStore, makeId } from "./store";
import type { Listing, ListingStatus } from "@/types";

function getStoredListings(): Listing[] {
  return readStore<Listing[]>("mb.listings", []);
}

function saveAll(listings: Listing[]): void {
  writeStore("mb.listings", listings);
}

export function saveListing(listing: Listing): void {
  const listings = getStoredListings();
  const index = listings.findIndex((l) => l.id === listing.id);
  if (index === -1) listings.push(listing);
  else listings[index] = listing;
  saveAll(listings);
}

export function setListingStatus(id: string, status: ListingStatus): void {
  const listings = getStoredListings();
  const index = listings.findIndex((l) => l.id === id);
  if (index === -1) return;
  listings[index] = { ...listings[index], status };
  saveAll(listings);
}

export function getListingsBySellerOverlay(
  sellerId: string,
  options?: { excludeId?: string; limit?: number; status?: ListingStatus }
): Listing[] {
  const all = [...LISTINGS, ...getStoredListings()];
  let matches = all.filter((l) => l.sellerId === sellerId && l.id !== options?.excludeId);
  if (options?.status) matches = matches.filter((l) => l.status === options.status);
  return options?.limit ? matches.slice(0, options.limit) : matches;
}

export function getListingBySlugOverlay(slug: string): Listing | undefined {
  return LISTINGS.find((l) => l.slug === slug) ?? getStoredListings().find((l) => l.slug === slug);
}

export function getListingByIdOverlay(id: string): Listing | undefined {
  return LISTINGS.find((l) => l.id === id) ?? getStoredListings().find((l) => l.id === id);
}

export function createListingId(): string {
  return makeId("l");
}

export function generateListingSlug(title: string): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "listing";
  const taken = new Set([...LISTINGS, ...getStoredListings()].map((l) => l.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
