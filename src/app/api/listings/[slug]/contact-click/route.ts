import { handler, ok } from "@/server/http/respond";
import { readJson, uuidSchema } from "@/server/http/validate";
import { contactClickSchema } from "@/server/schemas/listings";
import { enforceCsrf } from "@/server/auth/csrf";
import { enforceIpRateLimit } from "@/server/http/rate-limit";
import { bumpContact } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seller analytics signal: which channel a viewer used to reach out. No
 * identity stored. Dynamic segment is a listing id — see view/route.ts for
 * why the folder is still named `[slug]`.
 */
export const POST = handler(async (request, { params }: { params: Promise<{ slug: string }> }) => {
  await enforceCsrf(request);
  await enforceIpRateLimit("view", request);

  const { slug } = await params;
  const listingId = uuidSchema.parse(slug);
  const { channel } = await readJson(request, contactClickSchema);

  await bumpContact(listingId, channel);
  return ok(null, { status: 202 });
});
