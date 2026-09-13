import { handler, ok } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { searchListingsQuerySchema } from "@/server/schemas/listings";
import { searchListings } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The browse/search workhorse (§2.3 #17). One RPC (`fn_search_listings`)
 * answers filters, sort, pagination and facets together — see
 * server/services/listings.ts.
 */
export const GET = handler(async (request) => {
  const query = readQuery(request, searchListingsQuerySchema);
  const result = await searchListings(query);

  return ok({
    items: result.items,
    facets: result.facets,
    pageInfo: {
      nextCursor: null,
      hasMore: result.page * result.limit < result.total,
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  });
});
