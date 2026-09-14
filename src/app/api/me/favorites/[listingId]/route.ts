import { handler, ok } from "@/server/http/respond";
import { uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { removeFavorite } from "@/server/services/favorites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unsave a listing (§2.6 #37). */
export const DELETE = handler(async (request, context: { params: Promise<{ listingId: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { listingId } = await context.params;
  await removeFavorite(user.sub, uuidSchema.parse(listingId));

  return ok({ removed: true });
});
