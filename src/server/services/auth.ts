import "server-only";
import { db, PG } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { enforceRateLimit } from "../http/rate-limit";
import { clientIpHash } from "../http/request-context";
import {
  burnTimingBudget,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../auth/password";
import { signAccessToken } from "../auth/jwt";
import { createSession, newCsrfToken, revokeAllSessions } from "../auth/session";
import type { LoginInput, SignupInput } from "../schemas/auth";

/**
 * Account and session business logic. Route handlers stay thin: they parse,
 * call one of these, and set cookies.
 */

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

export type SessionBundle = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: PublicUser;
};

export type PublicUser = {
  id: string;
  phone: string;
  role: "customer" | "seller" | "admin";
  displayName: string;
  recoveryEmail: string | null;
  sellerId: string | null;
  sellerSlug: string | null;
};

type UserRow = {
  id: string;
  phone: string;
  password_hash: string;
  role: "customer" | "seller" | "admin";
  status: "active" | "suspended" | "deleted";
  display_name: string;
  recovery_email: string | null;
  failed_login_count: number;
  locked_until: string | null;
  deleted_at: string | null;
};

const USER_COLUMNS =
  "id, phone, password_hash, role, status, display_name, recovery_email, failed_login_count, locked_until, deleted_at";

async function sellerFor(userId: string): Promise<{ id: string; slug: string } | null> {
  const { data } = await db.from("sellers").select("id, slug").eq("user_id", userId).maybeSingle();
  return data ? { id: data.id, slug: data.slug } : null;
}

function toPublicUser(row: UserRow, seller: { id: string; slug: string } | null): PublicUser {
  return {
    id: row.id,
    phone: row.phone,
    role: row.role,
    displayName: row.display_name,
    recoveryEmail: row.recovery_email,
    sellerId: seller?.id ?? null,
    sellerSlug: seller?.slug ?? null,
  };
}

/** Mints everything a freshly authenticated caller needs. */
export async function issueSession(row: UserRow, request: Request): Promise<SessionBundle> {
  const seller = await sellerFor(row.id);
  const session = await createSession(row.id, request);

  const accessToken = await signAccessToken({
    sub: row.id,
    role: row.role,
    sid: session.sessionId,
    ...(seller ? { sellerId: seller.id } : {}),
  });

  return {
    accessToken,
    refreshToken: session.refreshToken,
    csrfToken: newCsrfToken(),
    user: toPublicUser(row, seller),
  };
}

/** Re-mints an access token for an existing session — used by /api/auth/refresh. */
export async function accessTokenForUser(userId: string, sessionId: string): Promise<{
  accessToken: string;
  user: PublicUser;
}> {
  const { data, error } = await db.from("users").select(USER_COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw new ApiError("INTERNAL", "Could not refresh the session.");

  const row = data as UserRow | null;
  if (!row || row.deleted_at) {
    throw new ApiError("AUTH_SESSION_REVOKED", "That account no longer exists.");
  }
  if (row.status === "suspended") {
    throw new ApiError("AUTH_ACCOUNT_SUSPENDED", "This account has been suspended.");
  }

  const seller = await sellerFor(row.id);

  return {
    // Role and sellerId are re-read here, so becoming a seller takes effect on
    // the next refresh without the user signing out.
    accessToken: await signAccessToken({
      sub: row.id,
      role: row.role,
      sid: sessionId,
      ...(seller ? { sellerId: seller.id } : {}),
    }),
    user: toPublicUser(row, seller),
  };
}

// ---------------------------------------------------------------------------

export async function signup(input: SignupInput, request: Request): Promise<SessionBundle> {
  const passwordHash = await hashPassword(input.password);

  const { data, error } = await db
    .from("users")
    .insert({
      phone: input.phone,
      password_hash: passwordHash,
      display_name: input.displayName,
      role: "customer",
    })
    .select(USER_COLUMNS)
    .single();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) {
      throw ApiError.conflict("That number already has an account. Sign in instead.", {
        phone: "This number is already registered.",
      });
    }
    log.error("signup insert failed", { code: error.code, message: error.message });
    throw new ApiError("INTERNAL", "Could not create the account. Please try again.");
  }

  log.info("account created", { userId: data.id });
  return issueSession(data as UserRow, request);
}

export async function login(input: LoginInput, request: Request): Promise<SessionBundle> {
  // Two limits: one per IP (a script working through numbers) and one per
  // phone (a script working through passwords for one account).
  await enforceRateLimit("auth", clientIpHash(request));
  await enforceRateLimit("authPhone", input.phone);

  const { data, error } = await db
    .from("users")
    .select(USER_COLUMNS)
    .eq("phone", input.phone)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new ApiError("INTERNAL", "Could not sign you in. Please try again.");

  const row = data as UserRow | null;

  if (!row) {
    // Verify against a real hash anyway so an unknown number takes the same
    // time as a wrong password — otherwise latency enumerates accounts.
    await burnTimingBudget(input.password);
    throw new ApiError("AUTH_INVALID_CREDENTIALS", "That number or password is incorrect.");
  }

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    const minutes = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000);
    throw new ApiError(
      "AUTH_ACCOUNT_LOCKED",
      `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );
  }

  if (row.status === "suspended") {
    throw new ApiError("AUTH_ACCOUNT_SUSPENDED", "This account has been suspended.");
  }

  const valid = await verifyPassword(row.password_hash, input.password);

  if (!valid) {
    const attempts = row.failed_login_count + 1;
    const lock = attempts >= LOCKOUT_THRESHOLD;
    await db
      .from("users")
      .update({
        failed_login_count: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", row.id);

    if (lock) {
      log.warn("account locked after repeated failures", { userId: row.id });
      throw new ApiError(
        "AUTH_ACCOUNT_LOCKED",
        `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
      );
    }
    throw new ApiError("AUTH_INVALID_CREDENTIALS", "That number or password is incorrect.");
  }

  // Transparent upgrade if the cost parameters have been raised since signup.
  const rehash = needsRehash(row.password_hash) ? await hashPassword(input.password) : null;

  await db
    .from("users")
    .update({
      failed_login_count: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      ...(rehash ? { password_hash: rehash } : {}),
    })
    .eq("id", row.id);

  return issueSession(row, request);
}

export async function changePassword(
  userId: string,
  sessionId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data } = await db.from("users").select(USER_COLUMNS).eq("id", userId).maybeSingle();
  const row = data as UserRow | null;
  if (!row) throw new ApiError("AUTH_SESSION_REVOKED", "That account no longer exists.");

  if (!(await verifyPassword(row.password_hash, currentPassword))) {
    throw ApiError.validation("That password is not correct.", {
      currentPassword: "That password is not correct.",
    });
  }

  await db
    .from("users")
    .update({ password_hash: await hashPassword(newPassword) })
    .eq("id", userId);

  // Everything else signs out: a password change is how someone responds to a
  // suspected compromise, and it has to actually evict the other party.
  const { revokeOtherSessions } = await import("../auth/session");
  await revokeOtherSessions(userId, sessionId, "password_changed");

  log.info("password changed", { userId });
}

export async function updateProfile(
  userId: string,
  patch: { displayName?: string; recoveryEmail?: string | null }
): Promise<PublicUser> {
  const update: Record<string, unknown> = {};
  if (patch.displayName !== undefined) update.display_name = patch.displayName;
  if (patch.recoveryEmail !== undefined) update.recovery_email = patch.recoveryEmail;

  const { data, error } = await db
    .from("users")
    .update(update)
    .eq("id", userId)
    .select(USER_COLUMNS)
    .single();

  if (error) throw new ApiError("INTERNAL", "Could not save those changes.");
  return toPublicUser(data as UserRow, await sellerFor(userId));
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const { data } = await db.from("users").select(USER_COLUMNS).eq("id", userId).maybeSingle();
  const row = data as UserRow | null;
  if (!row || row.deleted_at) return null;
  return toPublicUser(row, await sellerFor(userId));
}

export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const { data } = await db
    .from("users")
    .select("id")
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();
  return !data;
}

/**
 * Soft deletion.
 *
 * The row stays so reviews and listings keep a valid foreign key, but it is
 * anonymised, the phone number is released for re-registration, and every
 * session dies. The storefront and its listings are unpublished rather than
 * deleted, so a buyer's review history does not develop holes.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const seller = await sellerFor(userId);

  if (seller) {
    await db.from("listings").update({ status: "removed" }).eq("seller_id", seller.id);
    await db.from("sellers").update({ status: "closed" }).eq("id", seller.id);
  }

  await db
    .from("users")
    .update({
      deleted_at: new Date().toISOString(),
      status: "deleted",
      display_name: "Deleted account",
      recovery_email: null,
      // Release the number and make the row unauthenticatable. The phone
      // column is NOT NULL and unique-per-live-row, so it is rewritten rather
      // than cleared.
      phone: `+99${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 16),
      password_hash: "deleted",
    })
    .eq("id", userId);

  await revokeAllSessions(userId, "account_deleted");
  log.info("account deleted", { userId });
}
