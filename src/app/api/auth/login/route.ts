import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { loginSchema } from "@/server/schemas/auth";
import { login } from "@/server/services/auth";
import { setAuthCookies, setCsrfCookie } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign in. Rate limiting and lockout live in the service, because both the
 * per-IP and the per-phone limit need the parsed phone number.
 *
 * The CSRF token is reissued on success: a session boundary is exactly where a
 * token should be rotated.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);

  const input = await readJson(request, loginSchema);
  const session = await login(input, request);

  const jar = await cookies();
  await setAuthCookies(jar, session);
  await setCsrfCookie(jar, session.csrfToken);

  return ok({ user: session.user, csrfToken: session.csrfToken });
});
