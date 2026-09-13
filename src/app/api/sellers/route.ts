import { handler, okCached } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { sellersDirectoryQuerySchema } from "@/server/schemas/sellers-directory";
import { listSellers } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The /sellers directory (§2.4 #26). */
export const GET = handler(async (request) => {
  const query = readQuery(request, sellersDirectoryQuerySchema);
  const result = await listSellers(query);
  return okCached(result.items, 60, { meta: { total: result.total, limit: query.limit, page: query.page ?? 1 } });
});
