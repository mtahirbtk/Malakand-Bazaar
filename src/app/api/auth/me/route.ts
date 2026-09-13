import { cookies } from "next/headers";
import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { readJson } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { requireFreshUser, requireUser } from "@/server/auth/guard";
import { updateProfileSchema } from "@/server/schemas/auth";
import { deleteAccount, getPublicUser, updateProfile } from "@/server/services/auth";
import { clearAuthCookies } from "@/server/auth/cookies";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The client bootstraps from here on every load, so it is deliberately one
 * cheap read. Never cached — a stale identity is worse than an extra query.
 */
export const GET = handler(async () => {
  const claims = await requireUser();
  const user = await getPublicUser(claims.sub);
  if (!user) throw new ApiError("AUTH_SESSION_REVOKED", "That account no longer exists.");

  return ok({ user }, { headers: { "Cache-Control": "no-store" } });
});

export const PATCH = handler(async (request) => {
  await enforceCsrf(request);
  const claims = await requireUser();
  await enforceRateLimit("write", claims.sub);

  const patch = await readJson(request, updateProfileSchema);
  const user = await updateProfile(claims.sub, patch);

  return ok({ user });
});

/**
 * Account deletion. Anonymises rather than hard-deletes, so reviews and
 * listing history keep valid references — see deleteAccount.
 *
 * requireFreshUser, not requireUser: this is irreversible, so it re-reads the
 * account and confirms the session is still live rather than trusting a token
 * minted up to fifteen minutes ago.
 */
export const DELETE = handler(async (request) => {
  await enforceCsrf(request);
  const user = await requireFreshUser();
  await enforceRateLimit("write", user.id);

  await deleteAccount(user.id);
  await clearAuthCookies(await cookies());

  return ok({ deleted: true });
});
