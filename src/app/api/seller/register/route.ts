import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { enforceIpRateLimit } from "@/server/http/rate-limit";
import { currentUser } from "@/server/auth/guard";
import { registerSellerSchema } from "@/server/schemas/auth";
import { registerSeller } from "@/server/services/sellers";
import { accessTokenForUser, getPublicUser } from "@/server/services/auth";
import { createSession, newCsrfToken } from "@/server/auth/session";
import { verifyTurnstile } from "@/server/auth/turnstile";
import { setAccessCookie, setAuthCookies, setCsrfCookie } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Become a seller.
 *
 * Serves both paths the UI offers from one form: a signed-in customer
 * upgrading, and a new visitor registering a store and an account together.
 *
 * Either way the caller leaves holding a token that already says `seller`, so
 * the dashboard is reachable immediately rather than after a refresh cycle.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  await enforceIpRateLimit("auth", request);

  const input = await readJson(request, registerSellerSchema);
  const claims = await currentUser();
  const existing = claims ? await getPublicUser(claims.sub) : null;

  // Only a signed-out registration creates an account, so that is the only
  // path that needs the bot gate.
  if (!existing) await verifyTurnstile(input.turnstileToken, request);

  const result = await registerSeller(input, existing);

  const jar = await cookies();
  const csrfToken = newCsrfToken();

  if (claims) {
    // Keep the existing session; just re-mint the access token so it carries
    // the new role and sellerId. The refresh cookie is scoped to /api/auth
    // (see cookies.ts) so it is never present on this request — setAccessCookie
    // is the access-token-only half of setAuthCookies, for exactly this case.
    const { accessToken, user } = await accessTokenForUser(result.userId, claims.sid);
    setAccessCookie(jar, accessToken);
    await setCsrfCookie(jar, csrfToken);
    return ok({ seller: { id: result.sellerId, slug: result.slug }, user, csrfToken }, { status: 201 });
  }

  const session = await createSession(result.userId, request);
  const { accessToken, user } = await accessTokenForUser(result.userId, session.sessionId);

  await setAuthCookies(jar, { accessToken, refreshToken: session.refreshToken });
  await setCsrfCookie(jar, csrfToken);

  return ok({ seller: { id: result.sellerId, slug: result.slug }, user, csrfToken }, { status: 201 });
});
