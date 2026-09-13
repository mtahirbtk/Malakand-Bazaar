import { handler, ok } from "@/server/http/respond";
import { uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { deleteListingImage } from "@/server/services/seller-listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; imageId: string }> };

/** Ownership-checked; also deletes the Storage object (§2.8 #49). */
export const DELETE = handler<Context>(async (request, context) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const { id, imageId } = await context.params;
  await deleteListingImage(sellerId, uuidSchema.parse(id), uuidSchema.parse(imageId));

  return ok({ deleted: true });
});
