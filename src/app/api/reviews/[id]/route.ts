import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireFreshUser, requireUser } from "@/server/auth/guard";
import { updateReviewSchema } from "@/server/schemas/reviews";
import { deleteReview, updateReview } from "@/server/services/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Edit your own review (§2.5 #32). */
export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { id } = await context.params;
  const reviewId = uuidSchema.parse(id);
  const patch = await readJson(request, updateReviewSchema);
  const review = await updateReview(reviewId, user.sub, patch);

  return ok({ review });
});

/** Delete your own review, or an admin moderating (§2.5 #33). */
export const DELETE = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { id } = await context.params;
  const reviewId = uuidSchema.parse(id);

  // The cached JWT claim lives for 15 minutes (guard.ts) — fine for
  // identifying the caller, but not to grant delete-any-review. Only a
  // freshly-reverified admin role is trusted for that branch, so a demoted
  // or suspended admin loses the privilege immediately rather than at the
  // next token refresh.
  const role = user.role === "admin" ? (await requireFreshUser()).role : user.role;
  await deleteReview(reviewId, { id: user.sub, role });

  return ok({ deleted: true });
});
