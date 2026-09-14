import { cookies } from "next/headers";
import { db } from "@/server/db";
import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { uuidSchema } from "@/server/http/validate";
import { requireUser } from "@/server/auth/guard";
import { revokeSession } from "@/server/auth/session";
import { clearAuthCookies } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * End one session.
 *
 * Ownership is in the query, not an `if`: the delete matches on both the
 * session id and the caller's user id, so another user's session id simply
 * matches no row.
 */
export const DELETE = handler<Context>(async (request, context) => {
  await enforceCsrf(request);
  const claims = await requireUser();

  const { id } = await context.params;
  const sessionId = uuidSchema.parse(id);

  const { data } = await db
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", claims.sub)
    .is("revoked_at", null)
    .maybeSingle();

  if (!data) throw ApiError.notFound("That session");

  await revokeSession(sessionId, "revoked_by_user");

  // Revoking your own current session is just a sign-out.
  if (sessionId === claims.sid) {
    await clearAuthCookies(await cookies());
  }

  return ok({ revoked: true, wasCurrent: sessionId === claims.sid });
});
