import { handler, okCached } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { topSellersQuerySchema } from "@/server/schemas/sellers-directory";
import { topSellers } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Homepage top-sellers widget (§2.4 #30). Static "top" sibling next to the
 * dynamic [slug] segment — same coexistence already used by
 * /api/listings/suggest next to /api/listings/[slug]. */
export const GET = handler(async (request) => {
  const query = readQuery(request, topSellersQuerySchema);
  const items = await topSellers(query);
  return okCached(items, 300);
});
