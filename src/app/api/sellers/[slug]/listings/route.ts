import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { readQuery } from "@/server/http/validate";
import { publicSellerListingsQuerySchema } from "@/server/schemas/public-seller-listings";
import { getSellerDetail } from "@/server/services/sellers";
import { listPublicSellerListings } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Paginated listings tab on the storefront (§2.4 #28). */
export const GET = handler(async (request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const seller = await getSellerDetail(slug);
  if (!seller) throw ApiError.notFound("That seller");

  const query = readQuery(request, publicSellerListingsQuerySchema);
  const result = await listPublicSellerListings(seller.id, query);
  return ok(result.items, { meta: { total: result.total, limit: query.limit, page: query.page ?? 1 } });
});
