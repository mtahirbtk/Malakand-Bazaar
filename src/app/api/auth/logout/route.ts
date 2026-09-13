import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { currentUser } from "@/server/auth/guard";
import { revokeSession } from "@/server/auth/session";
import { clearAuthCookies } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign out this device.
 *
 * Always succeeds from the caller's point of view: cookies are cleared even if
 * the token was already invalid, so a user can never get stuck in a state
 * where the UI thinks they are signed in and logout refuses to help.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);

  const user = await currentUser();
  if (user) await revokeSession(user.sid, "logout");

  await clearAuthCookies(await cookies());
  return ok({ signedOut: true });
});
