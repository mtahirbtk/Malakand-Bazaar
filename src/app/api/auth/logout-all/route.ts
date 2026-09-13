import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { requireUser } from "@/server/auth/guard";
import { revokeAllSessions } from "@/server/auth/session";
import { clearAuthCookies } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sign out every device — the response to "I think someone has my password". */
export const POST = handler(async (request) => {
  await enforceCsrf(request);

  const user = await requireUser();
  await revokeAllSessions(user.sub, "logout_all");
  await clearAuthCookies(await cookies());

  return ok({ signedOut: true });
});
