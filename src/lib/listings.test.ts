import { describe, it, expect } from "vitest";
import { getListingBySlug, getListingsBySeller } from "./listings";
import { LISTINGS } from "@/data/fixtures/listings";

describe("getListingBySlug", () => {
  it("finds a listing by slug", () => {
    const first = LISTINGS[0];
    expect(getListingBySlug(first.slug)?.id).toBe(first.id);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getListingBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("getListingsBySeller", () => {
  it("returns only that seller's listings", () => {
    const sellerId = LISTINGS[0].sellerId;
    const results = getListingsBySeller(sellerId);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((l) => l.sellerId === sellerId)).toBe(true);
  });

  it("excludes the given id and respects limit", () => {
    const sellerId = LISTINGS[0].sellerId;
    const results = getListingsBySeller(sellerId, { excludeId: LISTINGS[0].id, limit: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
    expect(results.find((l) => l.id === LISTINGS[0].id)).toBeUndefined();
  });
});
