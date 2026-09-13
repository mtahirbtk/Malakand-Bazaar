import { handler, ok } from "@/server/http/respond";
import { readJson, uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { updateListingSchema } from "@/server/schemas/seller";
import { getOwnListingById, softDeleteListing, updateListing } from "@/server/services/seller-listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Ownership-checked fetch for the edit form (§2.8 #44). 404 on a mismatch, never 403. */
export const GET = handler<Context>(async (_request, context) => {
  const { sellerId } = await requireSeller();
  const { id } = await context.params;
  const listing = await getOwnListingById(sellerId, uuidSchema.parse(id));
  return ok({ listing }, { headers: { "Cache-Control": "no-store" } });
});

/** Update (§2.8 #45). Re-enters moderation on a material change — see updateListing(). */
export const PATCH = handler<Context>(async (request, context) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const { id } = await context.params;
  const patch = await readJson(request, updateListingSchema);
  const listing = await updateListing(sellerId, uuidSchema.parse(id), patch);

  return ok({ listing });
});

/** Soft delete: removed + deleted_at, keeps analytics history (§2.8 #47). */
export const DELETE = handler<Context>(async (request, context) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const { id } = await context.params;
  await softDeleteListing(sellerId, uuidSchema.parse(id));

  return ok({ deleted: true });
});
