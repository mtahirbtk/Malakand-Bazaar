import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../env";

/**
 * What we are allowed to know about a caller.
 *
 * The raw IP is used only in-process, to build a rate-limit key and a session
 * fingerprint, and is never stored or logged. What gets persisted is
 * `sha256(ip + pepper + today)` — the daily salt rotation means the hash cannot
 * be used to follow anyone across days, and no rainbow table over the IPv4
 * space survives the pepper.
 */

/**
 * Trust model: on Vercel, `x-forwarded-for` is set by the platform edge and the
 * leftmost entry is the real client. Behind any other proxy this must be
 * revisited — a spoofable client IP would let an attacker evade rate limits by
 * rotating the header.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "0.0.0.0";
}

function dailySalt(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stable for one calendar day, unlinkable across days. Safe to persist. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}|${env.AUTH_TOKEN_PEPPER}|${dailySalt()}`)
    .digest("base64url")
    .slice(0, 32);
}

export function clientIpHash(request: Request): string {
  return hashIp(clientIp(request));
}

/** Truncated UA for the "your active devices" list. Not a fingerprint. */
export function userAgent(request: Request): string | null {
  const ua = request.headers.get("user-agent");
  return ua ? ua.slice(0, 200) : null;
}

export function requestId(request: Request): string {
  return request.headers.get("x-request-id") ?? randomUUID();
}

/**
 * Crawlers and monitors should not inflate view counts. Deliberately a
 * conservative list: a false negative costs one extra view, a false positive
 * silently loses a real one.
 */
const BOT_UA =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|preview|monitor|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|go-http|java\/|okhttp/i;

export function isProbablyBot(request: Request): boolean {
  const ua = request.headers.get("user-agent");
  if (!ua) return true; // no UA at all is a script, not a person in a browser
  return BOT_UA.test(ua);
}
