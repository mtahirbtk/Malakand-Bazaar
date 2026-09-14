import { handler, ok } from "@/server/http/respond";
import { readJson, readQuery, paginationSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { addFavoriteSchema } from "@/server/schemas/favorites";
import { addFavorite, listFavorites } from "@/server/services/favorites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** My saved listings, joined with live listing data (§2.6 #35). */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const query = readQuery(request, paginationSchema);
  const result = await listFavorites(user.sub, query);
  return ok(result.items, {
    meta: { total: result.total, limit: query.limit, page: query.page ?? 1 },
    headers: { "Cache-Control": "no-store" },
  });
});

/** Save a listing. Idempotent (§2.6 #36). */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { listingId } = await readJson(request, addFavoriteSchema);
  await addFavorite(user.sub, listingId);

  return ok({ saved: true }, { status: 201 });
});
