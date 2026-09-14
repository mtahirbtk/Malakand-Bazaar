import { handler, ok } from "@/server/http/respond";
import { uuidSchema } from "@/server/http/validate";
import { enforceCsrf } from "@/server/auth/csrf";
import { enforceIpRateLimit } from "@/server/http/rate-limit";
import { isProbablyBot } from "@/server/http/request-context";
import { bumpView } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * +1 per landing, no identity stored (§5). Fires from the detail page on
 * mount with `keepalive`, no await on the client — the 202 here just means
 * "counted", nothing more.
 *
 * The dynamic segment is a listing id (§2.3 #21 uses `:id`, not `:slug`) but
 * the folder is still named `[slug]` — Next.js requires every dynamic
 * segment at the same route level (`/api/listings/*`) to share one param
 * name, and `/api/listings/[slug]` (detail, related, seller-others) already
 * claims it. The value is validated as a uuid regardless of what the folder
 * calls it.
 */
export const POST = handler(async (request, { params }: { params: Promise<{ slug: string }> }) => {
  await enforceCsrf(request);

  const { slug } = await params;
  const listingId = uuidSchema.parse(slug);

  // A bot ping still gets a 202 — it just doesn't count — so a crawler can't
  // distinguish "counted" from "filtered" and route around this check.
  if (!isProbablyBot(request)) {
    await enforceIpRateLimit("view", request);
    await bumpView(listingId);
  }

  return ok(null, { status: 202 });
});
