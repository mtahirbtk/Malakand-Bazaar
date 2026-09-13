import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { readJson } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { updateSellerSchema } from "@/server/schemas/seller";
import { getSellerById, updateSeller } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** My own storefront, private fields included (§2.8 #40). Dashboard bootstrap. */
export const GET = handler(async () => {
  const { sellerId } = await requireSeller();
  const seller = await getSellerById(sellerId);
  if (!seller) throw ApiError.notFound("Your storefront");
  return ok({ seller }, { headers: { "Cache-Control": "no-store" } });
});

/** Profile edit (§2.8 #41). Slug is not accepted — see updateSellerSchema. */
export const PATCH = handler(async (request) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const patch = await readJson(request, updateSellerSchema);
  const seller = await updateSeller(sellerId, patch);

  return ok({ seller });
});
