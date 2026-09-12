import { describe, it, expect, beforeEach } from "vitest";
import {
  saveListing,
  setListingStatus,
  getListingsBySellerOverlay,
  getListingBySlugOverlay,
  getListingByIdOverlay,
  generateListingSlug,
} from "./listings";
import { LISTINGS } from "@/data/fixtures/listings";
import type { Listing } from "@/types";

const NEW_LISTING: Listing = {
  id: "l_new1",
  slug: "used-generator-5kva",
  title: "Used Generator 5kVA",
  description: "Well maintained diesel generator.",
  price: 150000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_new1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

describe("mock-db listings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("finds an existing fixture listing by slug", () => {
    expect(getListingBySlugOverlay(LISTINGS[0].slug)?.id).toBe(LISTINGS[0].id);
  });

  it("saves and returns a runtime-created listing for its seller", () => {
    saveListing(NEW_LISTING);
    const listings = getListingsBySellerOverlay("s_new1");
    expect(listings).toHaveLength(1);
    expect(listings[0].title).toBe("Used Generator 5kVA");
  });

  it("updates status in place", () => {
    saveListing(NEW_LISTING);
    setListingStatus("l_new1", "sold");
    expect(getListingByIdOverlay("l_new1")?.status).toBe("sold");
  });

  it("filters by status when asked", () => {
    saveListing(NEW_LISTING);
    saveListing({ ...NEW_LISTING, id: "l_new2", slug: "used-generator-2", status: "removed" });
    expect(getListingsBySellerOverlay("s_new1", { status: "active" })).toHaveLength(1);
  });

  it("generates a unique slug, appending a number on collision", () => {
    expect(generateListingSlug("Brand New Item")).toBe("brand-new-item");
    saveListing({ ...NEW_LISTING, id: "l_new3", slug: "brand-new-item" });
    expect(generateListingSlug("Brand New Item")).toBe("brand-new-item-2");
  });
});
