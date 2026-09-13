import "server-only";
import { db } from "../db";
import { ApiError } from "../http/errors";
import { verifyAccessToken, type AccessClaims } from "./jwt";
import { readAccessToken } from "./cookies";
import { isSessionActive } from "./session";

/**
 * Authorization.
 *
 * Middleware gates route prefixes so an unauthenticated visitor never sees a
 * protected page render — but middleware is a UX layer. These guards are the
 * boundary, and every handler calls one. A direct fetch that skips the page is
 * checked here regardless.
 *
 * Two tiers, deliberately:
 *
 *   currentUser / requireUser   — verify the JWT only. No database read, so
 *                                 an ordinary authenticated request costs
 *                                 nothing extra. Safe because the token lives
 *                                 15 minutes.
 *   requireFreshUser            — additionally re-reads the account from the
 *                                 database. Used for anything privileged or
 *                                 destructive, so a ban or a role change takes
 *                                 effect immediately rather than at the next
 *                                 token refresh.
 */

export type AuthUser = AccessClaims;

export type FreshUser = {
  id: string;
  phone: string;
  role: "customer" | "seller" | "admin";
  status: "active" | "suspended" | "deleted";
  displayName: string;
  recoveryEmail: string | null;
  sellerId?: string;
  sessionId: string;
};

/** Claims from the access cookie, or null. Never throws. */
export async function currentUser(): Promise<AuthUser | null> {
  const token = await readAccessToken();
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireUser(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new ApiError("AUTH_REQUIRED", "Sign in to continue.");
  return user;
}

export async function requireSeller(): Promise<AuthUser & { sellerId: string }> {
  const user = await requireUser();
  if (user.role !== "seller" || !user.sellerId) {
    throw new ApiError("SELLER_REQUIRED", "Register a storefront to do that.");
  }
  return user as AuthUser & { sellerId: string };
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new ApiError("ADMIN_REQUIRED", "You do not have access to this.");
  }
  // An admin action is always worth the extra read.
  await requireFreshUser();
  return user;
}

/**
 * Re-reads the account and confirms the session behind the token is still
 * live. Use before anything privileged, destructive, or irreversible.
 */
export async function requireFreshUser(): Promise<FreshUser> {
  const claims = await requireUser();

  const { data, error } = await db
    .from("users")
    .select("id, phone, role, status, display_name, recovery_email, deleted_at, sellers(id)")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) throw new ApiError("INTERNAL", "Could not verify your account.");
  if (!data || data.deleted_at) {
    throw new ApiError("AUTH_SESSION_REVOKED", "That account no longer exists.");
  }
  if (data.status === "suspended") {
    throw new ApiError("AUTH_ACCOUNT_SUSPENDED", "This account has been suspended.");
  }
  if (!(await isSessionActive(claims.sid))) {
    throw new ApiError("AUTH_SESSION_REVOKED", "Your session has ended. Please sign in again.");
  }

  const seller = Array.isArray(data.sellers) ? data.sellers[0] : data.sellers;

  return {
    id: data.id,
    phone: data.phone,
    role: data.role,
    status: data.status,
    displayName: data.display_name,
    recoveryEmail: data.recovery_email,
    sellerId: seller?.id,
    sessionId: claims.sid,
  };
}

/**
 * Ownership check for seller-scoped resources.
 *
 * Prefer putting `seller_id = <id>` directly in the query's WHERE clause — a
 * mismatched id then updates zero rows rather than relying on anyone
 * remembering to call this. Use it where a read has already happened.
 */
export function assertOwnership(resourceSellerId: string, callerSellerId: string): void {
  if (resourceSellerId !== callerSellerId) {
    // 404 rather than 403: confirming a resource exists but belongs to someone
    // else is itself a disclosure.
    throw ApiError.notFound("That listing");
  }
}
