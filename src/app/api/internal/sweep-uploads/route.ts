import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { env } from "@/server/env";
import { sweepPendingUploads } from "@/server/services/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Orphan upload cleanup — driven by a platform scheduler (Vercel Cron), not
 * pg_cron: deleting a Cloudinary asset needs its Admin API, which Postgres
 * cannot call. Same CRON_SECRET-bearer pattern the rank-refresh fallback in
 * docs/backend-plan.md §12 uses for the equivalent pg_cron gap.
 *
 * No CSRF check and no per-caller rate limit: this isn't a browser session,
 * it's a server calling a server with a shared secret — a different trust
 * boundary than every other route in this app.
 */
export const POST = handler(async (request) => {
  if (!env.CRON_SECRET) {
    throw new ApiError("INTERNAL", "CRON_SECRET is not configured.");
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    throw ApiError.unauthorized("Not authorized.");
  }

  const result = await sweepPendingUploads();
  return ok(result);
});
