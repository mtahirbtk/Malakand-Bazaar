import { handler, okCached } from "@/server/http/respond";
import { getHomePayload } from "@/server/services/home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One call for the whole homepage (§2.3 #25): readiness, shelves, trending, top sellers, counters. */
export const GET = handler(async () => {
  const payload = await getHomePayload();
  // Short cache: rank_score only moves every 10 minutes (pg_cron) and a view
  // ping doesn't need to be reflected instantly on the homepage.
  return okCached(payload, 60);
});
