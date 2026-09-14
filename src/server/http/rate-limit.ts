import "server-only";
import { db } from "../db";
import { ApiError } from "./errors";
import { clientIpHash } from "./request-context";
import { log } from "./log";

/**
 * Fixed-window rate limiting, counted in Postgres (see fn_rate_limit in
 * migration 0006). One round trip per check, no extra vendor.
 *
 * The buckets below are the ones docs/backend-plan.md §3.4 specifies. They are
 * deliberately generous for reads and tight for anything that costs money,
 * creates an account, or can be used to enumerate.
 */

export const BUCKETS = {
  /** Login, signup, refresh — per IP. */
  auth: { limit: 10, window: "1 minute" },
  /** Repeated failed logins for one phone number. */
  authPhone: { limit: 5, window: "15 minutes" },
  /** Phone-availability probe: the only endpoint that leaks registration state. */
  phoneProbe: { limit: 20, window: "10 minutes" },
  /** Any authenticated write. */
  write: { limit: 30, window: "1 minute" },
  /** View pings. High, because a real person refreshing is legitimate. */
  view: { limit: 60, window: "1 minute" },
  /** Anonymous abuse reports. */
  report: { limit: 5, window: "1 hour" },
  /** Public reads. */
  read: { limit: 300, window: "1 minute" },
  /** Signed upload URLs. */
  upload: { limit: 40, window: "10 minutes" },
} as const;

export type BucketName = keyof typeof BUCKETS;

type LimitRow = { allowed: boolean; remaining: number; reset_at: string };

/**
 * Throws ApiError(RATE_LIMITED) when the caller is over the limit.
 *
 * `subject` scopes the bucket — usually an IP hash or a user id. Pass one
 * explicitly for per-user limits so a shared office IP does not throttle a
 * whole street.
 */
export async function enforceRateLimit(
  bucket: BucketName,
  subject: string
): Promise<{ remaining: number; resetAt: Date }> {
  const { limit, window } = BUCKETS[bucket];
  const key = `${bucket}:${subject}`;

  const { data, error } = await db.rpc("fn_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window: window,
  });

  if (error) {
    // Fail open: a limiter outage must not take the marketplace down with it.
    // It is logged at warn so the alert fires.
    log.warn("rate limiter unavailable, allowing request", { bucket, error: error.message });
    return { remaining: limit, resetAt: new Date(Date.now() + 60_000) };
  }

  const row = (Array.isArray(data) ? data[0] : data) as LimitRow | undefined;
  if (!row) return { remaining: limit, resetAt: new Date(Date.now() + 60_000) };

  const resetAt = new Date(row.reset_at);
  if (!row.allowed) {
    throw ApiError.rateLimited((resetAt.getTime() - Date.now()) / 1000);
  }
  return { remaining: row.remaining, resetAt };
}

/** Convenience for the common "limit this by caller IP" case. */
export function enforceIpRateLimit(bucket: BucketName, request: Request) {
  return enforceRateLimit(bucket, clientIpHash(request));
}
