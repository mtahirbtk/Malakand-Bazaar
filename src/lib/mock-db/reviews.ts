import { readStore, writeStore, makeId } from "./store";
import type { Review, Seller } from "@/types";

function getStoredReviews(): Review[] {
  return readStore<Review[]>("mb.reviews", []);
}

export function getReviewsForSeller(sellerId: string): Review[] {
  return getStoredReviews()
    .filter((r) => r.sellerId === sellerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMyReviewForSeller(sellerId: string, buyerId: string): Review | undefined {
  return getStoredReviews().find((r) => r.sellerId === sellerId && r.buyerId === buyerId);
}

export function upsertReview(input: {
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
}): Review {
  const reviews = getStoredReviews();
  const index = reviews.findIndex((r) => r.sellerId === input.sellerId && r.buyerId === input.buyerId);
  const review: Review = {
    id: index === -1 ? makeId("r") : reviews[index].id,
    sellerId: input.sellerId,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    rating: input.rating,
    comment: input.comment,
    createdAt: index === -1 ? new Date().toISOString() : reviews[index].createdAt,
  };
  if (index === -1) reviews.push(review);
  else reviews[index] = review;
  writeStore("mb.reviews", reviews);
  return review;
}

/**
 * Fixture sellers ship with a seed rating/reviewCount representing reviews
 * with no backing Review rows. Treat that seed as a weighted baseline and
 * blend stored reviews into it, rather than recomputing from stored
 * reviews alone (which would make one new review read as "5.0 (1)").
 */
export function getSellerRatingSummary(seller: Seller): { rating: number; reviewCount: number } {
  const stored = getReviewsForSeller(seller.id);
  const baselineTotal = seller.rating * seller.reviewCount;
  const storedTotal = stored.reduce((sum, r) => sum + r.rating, 0);
  const reviewCount = seller.reviewCount + stored.length;
  const rating = reviewCount === 0 ? 0 : (baselineTotal + storedTotal) / reviewCount;
  return { rating: Math.round(rating * 10) / 10, reviewCount };
}
