import { handler, ok } from "@/server/http/respond";
import { readJson, readQuery } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { createListingSchema, sellerListingsQuerySchema } from "@/server/schemas/seller";
import { createListing, listSellerListings } from "@/server/services/seller-listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** My listings: filter by status, search, sort, paginated (§2.8 #42). */
export const GET = handler(async (request) => {
  const { sellerId } = await requireSeller();
  const query = readQuery(request, sellerListingsQuerySchema);
  const result = await listSellerListings(sellerId, query);
  return ok(result.items, {
    meta: { total: result.total, page: result.page, limit: result.limit },
    headers: { "Cache-Control": "no-store" },
  });
});

/** Create a listing (§2.8 #43). Server owns slug, status and moderation_status. */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const input = await readJson(request, createListingSchema);
  const listing = await createListing(sellerId, input);

  return ok({ listing }, { status: 201 });
});
