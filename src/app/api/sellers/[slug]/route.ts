import { handler, okCached } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { getSellerDetail } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Storefront header + stats (§2.4 #27). */
export const GET = handler(async (_request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const seller = await getSellerDetail(slug);
  if (!seller) throw ApiError.notFound("That seller");
  return okCached({ seller }, 60);
});
