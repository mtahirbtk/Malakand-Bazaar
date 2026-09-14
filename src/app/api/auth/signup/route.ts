import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { enforceIpRateLimit } from "@/server/http/rate-limit";
import { signupSchema } from "@/server/schemas/auth";
import { signup } from "@/server/services/auth";
import { verifyTurnstile } from "@/server/auth/turnstile";
import { setAuthCookies, setCsrfCookie } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create an account. Phone and password only — no email, no OTP
 * (docs/decisions.md). Turnstile is the sole brake on bulk registration, so it
 * runs before the password is hashed and before any row is written.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  await enforceIpRateLimit("auth", request);

  const input = await readJson(request, signupSchema);
  await verifyTurnstile(input.turnstileToken, request);

  const session = await signup(input, request);

  const jar = await cookies();
  await setAuthCookies(jar, session);
  await setCsrfCookie(jar, session.csrfToken);

  return ok({ user: session.user, csrfToken: session.csrfToken }, { status: 201 });
});
