import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "../http/errors";
import { env } from "../env";
import { CSRF_COOKIE } from "./cookies";
import { safeEqual } from "./session";

/**
 * CSRF: double-submit cookie plus an origin check.
 *
 * Two independent conditions must hold for any state-changing request:
 *
 *   1. the `X-CSRF-Token` header equals the `mb_csrf` cookie. A cross-site
 *      attacker can make the browser *send* our cookies but cannot read them,
 *      so it cannot produce the matching header.
 *   2. the Origin (or Referer) is our own site.
 *
 * SameSite=Lax on the session cookie is a third layer, not a replacement:
 * it does not cover every browser or every navigation shape, and relying on
 * it alone leaves top-level POST navigations exposed.
 */

export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigins(): string[] {
  const origins = [env.NEXT_PUBLIC_SITE_URL];
  // Vercel gives each deployment its own hostname; the preview UI must still work.
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  return origins;
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins();

  if (origin) return allowed.includes(origin);

  // Some browsers omit Origin on same-origin form posts; fall back to Referer.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Neither header present: a browser always sends at least one on a
  // cross-site write, so this is a non-browser client. Reject it here and let
  // it authenticate as an API caller when that exists.
  return false;
}

/**
 * Enforces CSRF on any state-changing request. Safe methods pass through.
 */
export async function enforceCsrf(request: Request): Promise<void> {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;

  if (!originAllowed(request)) {
    throw new ApiError("CSRF_FAILED", "That request came from an unrecognised origin.");
  }

  const header = request.headers.get(CSRF_HEADER);
  const cookie = (await cookies()).get(CSRF_COOKIE)?.value;

  if (!header || !cookie || !safeEqual(header, cookie)) {
    throw new ApiError("CSRF_FAILED", "Your session token did not match. Refresh the page and try again.");
  }
}
