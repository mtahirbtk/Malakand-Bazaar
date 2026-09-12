import { describe, it, expect, beforeEach } from "vitest";
import { getReviewsForSeller, upsertReview, getSellerRatingSummary, getMyReviewForSeller } from "./reviews";
import type { Seller } from "@/types";

const SELLER: Seller = {
  id: "s1",
  slug: "khan-solar-engineering",
  name: "Khan Solar & Engineering",
  initials: "KS",
  tehsilSlug: "dargai",
  localityLabel: "Dargai Industrial Belt",
  rating: 4.9,
  reviewCount: 142,
  verified: true,
  responseMinutes: 15,
  specialty: "VFD Inverters",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

describe("mock-db reviews", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns no reviews for a seller with none stored", () => {
    expect(getReviewsForSeller("s1")).toEqual([]);
  });

  it("adds a review and returns it in the list, newest first", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    const reviews = getReviewsForSeller("s1");
    expect(reviews).toHaveLength(1);
    expect(reviews[0].buyerName).toBe("Bilal");
  });

  it("replaces the same buyer's existing review instead of adding a second", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 3, comment: "Updated." });
    const reviews = getReviewsForSeller("s1");
    expect(reviews).toHaveLength(1);
    expect(reviews[0].rating).toBe(3);
  });

  it("finds a buyer's own review for a seller", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 4, comment: "Good." });
    expect(getMyReviewForSeller("s1", "u1")?.rating).toBe(4);
    expect(getMyReviewForSeller("s1", "u2")).toBeUndefined();
  });

  it("blends a new review into the seed baseline rather than resetting it", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    const summary = getSellerRatingSummary(SELLER);
    expect(summary.reviewCount).toBe(143);
    // (4.9*142 + 5) / 143 ≈ 4.9007 → rounds to 4.9
    expect(summary.rating).toBeCloseTo(4.9, 1);
  });
});
