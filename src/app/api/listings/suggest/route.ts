import { handler, okCached } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { suggestListingsQuerySchema } from "@/server/schemas/listings";
import { suggestListings } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Typeahead (§2.3 #23): up to 8 live listing titles matching the query. */
export const GET = handler(async (request) => {
  const { q, limit } = readQuery(request, suggestListingsQuerySchema);
  const results = await suggestListings(q, limit);
  return okCached(results, 30);
});
