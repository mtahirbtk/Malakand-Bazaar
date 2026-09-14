import { handler, ok } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { requireSeller } from "@/server/auth/guard";
import { sellerAnalyticsQuerySchema } from "@/server/schemas/seller";
import { getSellerAnalytics } from "@/server/services/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Views + contact clicks by day (30/90d), per-listing table, totals (§2.8 #50). */
export const GET = handler(async (request) => {
  const { sellerId } = await requireSeller();
  const { days } = readQuery(request, sellerAnalyticsQuerySchema);
  const analytics = await getSellerAnalytics(sellerId, days);
  return ok(analytics, { headers: { "Cache-Control": "no-store" } });
});
