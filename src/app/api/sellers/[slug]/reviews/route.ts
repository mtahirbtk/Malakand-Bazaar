import { handler, ok, okCached } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { readJson, readQuery } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { createReviewSchema, sellerReviewsQuerySchema } from "@/server/schemas/reviews";
import { createReview, listSellerReviews } from "@/server/services/reviews";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sellerIdForSlug(slug: string): Promise<string> {
  const { data } = await db.from("sellers").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!data) throw ApiError.notFound("That seller");
  return data.id;
}

/** Public reviews list, newest first, with a rating histogram (§2.4 #29). */
export const GET = handler(async (request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const sellerId = await sellerIdForSlug(slug);
  const query = readQuery(request, sellerReviewsQuerySchema);
  const result = await listSellerReviews(sellerId, query);
  return okCached(result.items, 30, { meta: { total: result.total, histogram: result.histogram } });
});

/** Write a review — one per (buyer, seller) (§2.5 #31). */
export const POST = handler(async (request, context: { params: Promise<{ slug: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { slug } = await context.params;
  const sellerId = await sellerIdForSlug(slug);
  const input = await readJson(request, createReviewSchema);
  const review = await createReview(sellerId, user.sub, input);

  return ok({ review }, { status: 201 });
});
