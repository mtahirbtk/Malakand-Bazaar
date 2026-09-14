import { handler, ok } from "@/server/http/respond";
import { readJson, uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { reorderImagesSchema } from "@/server/schemas/seller";
import { reorderListingImages } from "@/server/services/seller-listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** { ids: [] } → sort order, ownership-checked (§2.8 #48). */
export const POST = handler<Context>(async (request, context) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const { id } = await context.params;
  const { ids } = await readJson(request, reorderImagesSchema);
  const images = await reorderListingImages(sellerId, uuidSchema.parse(id), ids);

  return ok({ images });
});
