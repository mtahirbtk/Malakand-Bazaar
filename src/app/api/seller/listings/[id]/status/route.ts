import { handler, ok } from "@/server/http/respond";
import { readJson, uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { updateListingStatusSchema } from "@/server/schemas/seller";
import { updateListingStatus } from "@/server/services/seller-listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** active | reserved | sold | removed (§2.8 #46). "removed" is terminal — see LEGAL_TRANSITIONS. */
export const PATCH = handler<Context>(async (request, context) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("write", sub);

  const { id } = await context.params;
  const { status } = await readJson(request, updateListingStatusSchema);
  const listing = await updateListingStatus(sellerId, uuidSchema.parse(id), status);

  return ok({ listing });
});
