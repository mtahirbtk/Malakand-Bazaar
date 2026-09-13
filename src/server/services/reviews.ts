// src/server/services/reviews.ts
import "server-only";
import { db, PG } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import type { CreateReviewInput, MyReviewsQuery, SellerReviewsQuery, UpdateReviewInput } from "../schemas/reviews";

/**
 * Reviews — §2.5 #31-34. The DB owns the invariants application code would
 * otherwise have to re-check:
 *
 *   - `reviews_one_per_buyer_uniq (seller_id, buyer_id)` — a second POST hits
 *     PG.UNIQUE_VIOLATION, translated to 409 CONFLICT below.
 *   - `trg_reviews_no_self` — reviewing your own storefront raises P0001,
 *     translated to a validation error below.
 *   - `trg_reviews_aggregate` — every insert/update/delete recomputes the
 *     seller's rating_avg/rating_count/rating_score (migration 0007). This
 *     layer never touches those columns.
 */

export type ReviewItem = {
  id: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewHistogram = { 1: number; 2: number; 3: number; 4: number; 5: number };

type ReviewRow = {
  id: string;
  buyer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

/** Batch-fetches display names for a page of reviews — one round trip, not N. */
async function buyerNames(buyerIds: string[]): Promise<Map<string, string>> {
  if (buyerIds.length === 0) return new Map();
  const { data } = await db.from("users").select("id, display_name").in("id", buyerIds);
  return new Map((data ?? []).map((u) => [u.id, u.display_name as string]));
}

function toReviewItem(row: ReviewRow, buyerName: string): ReviewItem {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps the two DB-enforced invariants to friendly errors; rethrows anything
 * else. The self-review trigger (`fn_reviews_no_self`, migration 0007)
 * explicitly sets `errcode = 'check_violation'` (PG.CHECK_VIOLATION,
 * `23514`) — the same SQLSTATE a plain `check (...)` constraint violation
 * would raise (e.g. `reviews_rating_chk`, unreachable here since zod already
 * bounds rating/comment before this query runs, but sharing the code
 * regardless). The message text is what's actually unique to this trigger,
 * so match on that, not on the error code.
 */
function translateReviewWriteError(error: { code?: string; message: string }, context: Record<string, unknown>): never {
  if (error.code === PG.UNIQUE_VIOLATION) {
    throw ApiError.conflict("You have already reviewed this seller. Edit your existing review instead.");
  }
  if (/cannot review their own storefront/.test(error.message)) {
    throw ApiError.validation("You cannot review your own storefront.");
  }
  log.error("review write failed", { ...context, code: error.code, message: error.message });
  throw new ApiError("INTERNAL", "Could not save your review. Please try again.");
}

export async function createReview(sellerId: string, buyerId: string, input: CreateReviewInput): Promise<ReviewItem> {
  const { data, error } = await db
    .from("reviews")
    .insert({ seller_id: sellerId, buyer_id: buyerId, rating: input.rating, comment: input.comment ?? null })
    .select("id, buyer_id, rating, comment, created_at, updated_at")
    .single();

  if (error) translateReviewWriteError(error, { sellerId, buyerId });

  return toReviewItem(data as ReviewRow, (await buyerNames([buyerId])).get(buyerId) ?? "");
}

export async function updateReview(reviewId: string, buyerId: string, input: UpdateReviewInput): Promise<ReviewItem> {
  const patch: Record<string, unknown> = {};
  if (input.rating !== undefined) patch.rating = input.rating;
  if (input.comment !== undefined) patch.comment = input.comment;

  const { data, error } = await db
    .from("reviews")
    .update(patch)
    .eq("id", reviewId)
    .eq("buyer_id", buyerId)
    .select("id, buyer_id, rating, comment, created_at, updated_at")
    .maybeSingle();

  if (error) translateReviewWriteError(error, { reviewId, buyerId });
  // Ownership mismatch or a deleted review both land here — same idiom as
  // getOwnListingById: 404, not 403 (see guard.ts's assertOwnership doc).
  if (!data) throw ApiError.notFound("That review");

  return toReviewItem(data as ReviewRow, (await buyerNames([buyerId])).get(buyerId) ?? "");
}

export async function deleteReview(reviewId: string, caller: { id: string; role: string }): Promise<void> {
  let query = db.from("reviews").delete().eq("id", reviewId);
  // §2.5 #33: own, or admin moderation. Audit logging for the admin path
  // lands with Phase 8's admin surface (docs/backend-plan.md §9) — this is
  // the plain delete until then.
  if (caller.role !== "admin") query = query.eq("buyer_id", caller.id);

  const { data, error } = await query.select("id");
  if (error) {
    log.error("review delete failed", { reviewId, callerId: caller.id, message: error.message });
    throw new ApiError("INTERNAL", "Could not delete that review. Please try again.");
  }
  if (!data || data.length === 0) throw ApiError.notFound("That review");
}

export async function listSellerReviews(
  sellerId: string,
  query: SellerReviewsQuery
): Promise<{ items: ReviewItem[]; total: number; histogram: ReviewHistogram }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  const [{ data, error, count }, { data: allRatings, error: histogramError }] = await Promise.all([
    db
      .from("reviews")
      .select("id, buyer_id, rating, comment, created_at, updated_at", { count: "exact" })
      .eq("seller_id", sellerId)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .range(from, to),
    // Histogram over every visible review, not just this page. Fine at
    // marketplace scale (a seller's total review count, not every review's
    // text) — revisit with a SQL group-by if a storefront ever has
    // thousands of reviews.
    db.from("reviews").select("rating").eq("seller_id", sellerId).eq("status", "visible"),
  ]);

  if (error) {
    log.error("listSellerReviews failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load reviews. Please try again.");
  }

  if (histogramError) {
    log.error("listSellerReviews failed", { sellerId, message: histogramError.message });
    throw new ApiError("INTERNAL", "Could not load reviews. Please try again.");
  }

  const rows = (data ?? []) as ReviewRow[];
  const names = await buyerNames(rows.map((r) => r.buyer_id));

  const histogram: ReviewHistogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allRatings ?? []) {
    histogram[r.rating as 1 | 2 | 3 | 4 | 5]++;
  }

  return {
    items: rows.map((row) => toReviewItem(row, names.get(row.buyer_id) ?? "")),
    total: count ?? 0,
    histogram,
  };
}

export type MyReviewItem = ReviewItem & { sellerId: string; sellerName: string; sellerSlug: string };

export async function listMyReviews(
  buyerId: string,
  query: MyReviewsQuery
): Promise<{ items: MyReviewItem[]; total: number }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  const { data, error, count } = await db
    .from("reviews")
    .select("id, buyer_id, seller_id, rating, comment, created_at, updated_at", { count: "exact" })
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("listMyReviews failed", { buyerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your reviews. Please try again.");
  }

  const rows = (data ?? []) as (ReviewRow & { seller_id: string })[];
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const { data: sellerRows } = sellerIds.length
    ? await db.from("sellers").select("id, name, slug").in("id", sellerIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const sellers = new Map((sellerRows ?? []).map((s) => [s.id, s]));

  return {
    items: rows.map((row) => ({
      ...toReviewItem(row, ""),
      sellerId: row.seller_id,
      sellerName: sellers.get(row.seller_id)?.name ?? "",
      sellerSlug: sellers.get(row.seller_id)?.slug ?? "",
    })),
    total: count ?? 0,
  };
}
