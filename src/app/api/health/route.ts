import { db } from "@/server/db";
import { ok, fail, handler } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";

/**
 * Liveness + readiness in one. The uptime monitor points here, so it must
 * check the thing that actually breaks — the database round trip — rather
 * than only proving the process is running.
 *
 * Never cached, and it deliberately reveals nothing beyond build identity.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handler(async () => {
  const started = Date.now();

  const { error } = await db.from("settings").select("key").limit(1);
  const dbMs = Date.now() - started;

  if (error) {
    return fail(
      new ApiError("UPSTREAM_UNAVAILABLE", "The database is not reachable right now.")
    );
  }

  return ok(
    {
      status: "ok" as const,
      time: new Date().toISOString(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      region: process.env.VERCEL_REGION ?? "local",
      checks: { database: { ok: true, ms: dbMs } },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
});
