import { handler, okCached } from "@/server/http/respond";
import { getHomePayload } from "@/server/services/home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One call for the whole homepage (§2.3 #25): top listings + counters. */
export const GET = handler(async () => {
  const payload = await getHomePayload();
  // Short cache: a view ping doesn't need to be reflected instantly on the homepage.
  return okCached(payload, 60);
});
