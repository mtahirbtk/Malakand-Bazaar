import "server-only";
import { env, turnstileEnabled } from "../env";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { clientIp } from "../http/request-context";

/**
 * Cloudflare Turnstile.
 *
 * Nothing else gates account creation — there is no email confirmation and no
 * SMS (docs/decisions.md) — so this is the only brake on bulk registration.
 * Free, and it does not put a puzzle in front of a real seller.
 *
 * Skipped entirely when the key pair is not configured, so local development
 * and tests do not need Cloudflare. That is also why the check is explicit at
 * every call site rather than implicit in a wrapper: it must be obvious when
 * it is off.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | undefined, request: Request): Promise<void> {
  if (!turnstileEnabled) return;

  if (!token) {
    throw new ApiError("TURNSTILE_FAILED", "Please complete the verification and try again.");
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY!,
    response: token,
    remoteip: clientIp(request),
  });

  let result: { success: boolean; "error-codes"?: string[] };
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // A slow Cloudflare must not hang a signup request indefinitely.
      signal: AbortSignal.timeout(5000),
    });
    result = await response.json();
  } catch (error) {
    // Fail closed: this is the only anti-abuse gate on signup, so an outage
    // must not become an open door.
    log.error("turnstile verification unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError("TURNSTILE_FAILED", "Verification is unavailable right now. Please try again shortly.");
  }

  if (!result.success) {
    log.warn("turnstile rejected a token", { codes: result["error-codes"] });
    throw new ApiError("TURNSTILE_FAILED", "Verification failed. Please try again.");
  }
}
