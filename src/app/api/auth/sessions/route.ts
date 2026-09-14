import { handler, ok } from "@/server/http/respond";
import { requireUser } from "@/server/auth/guard";
import { listActiveSessions } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The "signed in on these devices" list. Shows what the user needs to
 * recognise a session and end it — never the token, never the IP.
 */
export const GET = handler(async () => {
  const claims = await requireUser();
  const sessions = await listActiveSessions(claims.sub);

  return ok(
    {
      sessions: sessions.map((s) => ({
        id: s.id,
        current: s.id === claims.sid,
        device: describeDevice(s.user_agent),
        createdAt: s.created_at,
        lastUsedAt: s.last_used_at,
        expiresAt: s.expires_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
});

/** Coarse, human-readable device label. Not a fingerprint. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();

  const platform = ua.includes("android")
    ? "Android"
    : /iphone|ipad|ipod/.test(ua)
      ? "iPhone or iPad"
      : ua.includes("windows")
        ? "Windows"
        : ua.includes("mac os")
          ? "Mac"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown device";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("opr/") || ua.includes("opera")
      ? "Opera"
      : ua.includes("chrome")
        ? "Chrome"
        : ua.includes("firefox")
          ? "Firefox"
          : ua.includes("safari")
            ? "Safari"
            : null;

  return browser ? `${browser} on ${platform}` : platform;
}
