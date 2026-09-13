import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Access tokens.
 *
 * HS256 via `jose`, which runs on both the Node and Edge runtimes — the same
 * verify path is used by API handlers and by middleware, so there is one
 * implementation of "is this token valid", not two that can drift.
 *
 * Deliberately NOT marked `server-only`: middleware imports this, and
 * middleware is neither a Server Component nor a client bundle. The module
 * holds no database handle and reads only the signing secret.
 *
 * The token is short-lived (15 minutes) and carries just enough to authorise a
 * request without a database read. Anything that must be revocable instantly —
 * a ban, a role downgrade — is re-read from the database by the guards.
 */

export type AccessClaims = {
  /** User id. */
  sub: string;
  role: "customer" | "seller" | "admin";
  /** Session id, so a single device can be revoked. */
  sid: string;
  /** Present only when role is 'seller'. Saves a join on every dashboard call. */
  sellerId?: string;
};

type FullPayload = JWTPayload & AccessClaims & { typ: "access" };

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function config() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not set");
  return {
    secret: secretBytes(secret),
    previous: process.env.AUTH_JWT_SECRET_PREVIOUS
      ? secretBytes(process.env.AUTH_JWT_SECRET_PREVIOUS)
      : null,
    issuer: process.env.AUTH_JWT_ISSUER || "malakandbazaar",
    audience: process.env.AUTH_JWT_AUDIENCE || "malakandbazaar-web",
    ttl: process.env.AUTH_ACCESS_TOKEN_TTL || "15m",
  };
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  const { secret, issuer, audience, ttl } = config();
  return new SignJWT({ ...claims, typ: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(ttl)
    .sign(secret);
}

/**
 * Returns the claims, or null for anything that is not a currently valid
 * access token. Never throws — a bad token is an ordinary outcome, not an
 * exception, and callers should not have to guard every call site.
 *
 * Verifies against the previous secret too, so rotating AUTH_JWT_SECRET does
 * not sign every user out mid-session.
 */
export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  if (!token) return null;
  const { secret, previous, issuer, audience } = config();

  for (const key of previous ? [secret, previous] : [secret]) {
    try {
      const { payload } = await jwtVerify<FullPayload>(token, key, {
        issuer,
        audience,
        algorithms: ["HS256"],
      });
      // A refresh token must never be accepted where an access token is expected.
      if (payload.typ !== "access") return null;
      if (!payload.sub || !payload.sid || !payload.role) return null;
      return {
        sub: payload.sub,
        role: payload.role,
        sid: payload.sid,
        sellerId: payload.sellerId,
      };
    } catch {
      // Try the next key; fall through to null.
    }
  }
  return null;
}

/** Seconds until an access token expires, for cookie max-age. */
export function accessTokenMaxAge(): number {
  return parseDuration(process.env.AUTH_ACCESS_TOKEN_TTL || "15m");
}

export function refreshTokenMaxAge(): number {
  return parseDuration(process.env.AUTH_REFRESH_TOKEN_TTL || "30d");
}

/** Parses "15m" / "30d" / "3600" into seconds. */
export function parseDuration(value: string): number {
  const match = value.trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!match) throw new Error(`Unrecognised duration: ${value}`);
  const amount = Number(match[1]);
  switch ((match[2] || "s").toLowerCase()) {
    case "d": return amount * 86400;
    case "h": return amount * 3600;
    case "m": return amount * 60;
    default: return amount;
  }
}
