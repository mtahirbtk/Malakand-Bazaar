import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { enforceIpRateLimit } from "@/server/http/rate-limit";
import { rotateSession, newCsrfToken } from "@/server/auth/session";
import { accessTokenForUser } from "@/server/services/auth";
import {
  clearAuthCookies,
  readRefreshToken,
  setAuthCookies,
  setCsrfCookie,
} from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exchange a refresh token for a new access token, rotating the refresh token
 * in the process.
 *
 * Reuse of an already-rotated token revokes the whole family — see
 * rotateSession. When that happens the cookies are cleared here too, so the
 * client stops retrying with a token that will never work again.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  await enforceIpRateLimit("auth", request);

  const token = await readRefreshToken();
  if (!token) {
    throw new ApiError("AUTH_REQUIRED", "Sign in to continue.");
  }

  const jar = await cookies();

  let rotated;
  try {
    rotated = await rotateSession(token, request);
  } catch (error) {
    await clearAuthCookies(jar);
    throw error;
  }

  const { accessToken, user } = await accessTokenForUser(rotated.userId, rotated.sessionId);
  const csrfToken = newCsrfToken();

  await setAuthCookies(jar, { accessToken, refreshToken: rotated.refreshToken });
  await setCsrfCookie(jar, csrfToken);

  return ok({ user, csrfToken });
});
