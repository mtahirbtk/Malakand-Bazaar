import { handler, ok } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { requireUser } from "@/server/auth/guard";
import { myReviewsQuerySchema } from "@/server/schemas/reviews";
import { listMyReviews } from "@/server/services/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reviews I wrote — account page (§2.5 #34). */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const query = readQuery(request, myReviewsQuerySchema);
  const result = await listMyReviews(user.sub, query);

  return ok(result.items, {
    meta: { total: result.total, limit: query.limit, page: query.page ?? 1 },
    headers: { "Cache-Control": "no-store" },
  });
});
