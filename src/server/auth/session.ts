import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { env } from "../env";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { refreshTokenMaxAge } from "./jwt";
import { hashIp, clientIp, userAgent } from "../http/request-context";

/**
 * Refresh sessions.
 *
 * One row per live refresh token. The plaintext token is returned to the
 * caller once and never stored — the row keeps sha256(token + pepper), so a
 * database leak yields nothing a thief can present.
 *
 * Rotation with reuse detection:
 *   every refresh issues a new token and marks the old one `replaced_by`.
 *   Presenting a token that has already been replaced means two parties hold
 *   it — the legitimate client and a thief — so the entire family descended
 *   from that login is revoked and everyone re-authenticates. This is the
 *   standard containment for a stolen refresh token, and it is why rotation
 *   without reuse detection is not worth much.
 */

export type SessionRow = {
  id: string;
  user_id: string;
  family_id: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by: string | null;
  user_agent: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(`${token}${env.AUTH_TOKEN_PEPPER}`).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Constant-time comparison for tokens that arrive from the client. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type IssuedSession = { sessionId: string; refreshToken: string; familyId: string };

export async function createSession(
  userId: string,
  request: Request,
  familyId = randomUUID()
): Promise<IssuedSession> {
  const refreshToken = newToken();
  const expiresAt = new Date(Date.now() + refreshTokenMaxAge() * 1000);

  const { data, error } = await db
    .from("sessions")
    .insert({
      user_id: userId,
      family_id: familyId,
      refresh_hash: hashToken(refreshToken),
      user_agent: userAgent(request),
      ip_hash: hashIp(clientIp(request)),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new ApiError("INTERNAL", "Could not start a session. Please try again.");
  }

  return { sessionId: data.id, refreshToken, familyId };
}

export type RotatedSession = IssuedSession & { userId: string };

/**
 * Validates and rotates a refresh token.
 *
 * Throws AUTH_SESSION_REVOKED for every failure mode — unknown, expired,
 * revoked or replayed — so the response cannot be used to distinguish "never
 * existed" from "already used".
 */
export async function rotateSession(refreshToken: string, request: Request): Promise<RotatedSession> {
  const presented = hashToken(refreshToken);

  const { data: row, error } = await db
    .from("sessions")
    .select("id, user_id, family_id, expires_at, revoked_at, replaced_by")
    .eq("refresh_hash", presented)
    .maybeSingle();

  if (error) throw new ApiError("INTERNAL", "Could not refresh the session.");
  if (!row) throw new ApiError("AUTH_SESSION_REVOKED", "Your session has ended. Please sign in again.");

  // Replay: this token was already exchanged. Either the client is retrying
  // with a stale copy or a thief has one. Both are handled the same way,
  // because we cannot tell them apart — burn the whole family.
  if (row.replaced_by || row.revoked_at) {
    await db.rpc("fn_revoke_session_family", {
      p_family_id: row.family_id,
      p_reason: row.replaced_by ? "refresh_token_reuse" : "revoked",
    });
    log.warn("refresh token reuse detected, family revoked", {
      familyId: row.family_id,
      userId: row.user_id,
    });
    throw new ApiError("AUTH_SESSION_REVOKED", "Your session has ended. Please sign in again.");
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new ApiError("AUTH_SESSION_REVOKED", "Your session has expired. Please sign in again.");
  }

  // Issue the replacement first, then point the old row at it: if the second
  // write fails the client simply retries with a token that still works,
  // rather than being locked out by a half-finished rotation.
  const issued = await createSession(row.user_id, request, row.family_id);

  await db
    .from("sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: "rotated",
      replaced_by: issued.sessionId,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { ...issued, userId: row.user_id };
}

export async function revokeSession(sessionId: string, reason: string): Promise<void> {
  await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq("id", sessionId)
    .is("revoked_at", null);
}

export async function revokeAllSessions(userId: string, reason: string): Promise<void> {
  await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq("user_id", userId)
    .is("revoked_at", null);
}

/** Every session except the one named — used after a password change. */
export async function revokeOtherSessions(userId: string, keepSessionId: string, reason: string) {
  await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq("user_id", userId)
    .neq("id", keepSessionId)
    .is("revoked_at", null);
}

export async function listActiveSessions(userId: string): Promise<SessionRow[]> {
  const { data } = await db
    .from("sessions")
    .select("id, user_id, family_id, created_at, last_used_at, expires_at, revoked_at, replaced_by, user_agent")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("last_used_at", { ascending: false })
    .limit(50);

  return (data ?? []) as SessionRow[];
}

/** True when the session behind an access token is still live. */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const { data } = await db
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return Boolean(data);
}
