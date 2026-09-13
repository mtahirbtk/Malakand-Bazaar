import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { requireFreshUser } from "@/server/auth/guard";
import { changePasswordSchema } from "@/server/schemas/auth";
import { changePassword } from "@/server/services/auth";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Change password. Requires the current one — an attacker with a stolen
 * session must not be able to lock the owner out.
 *
 * On success every other session is revoked, so the change actually evicts
 * whoever prompted it.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const user = await requireFreshUser();
  await enforceRateLimit("auth", user.id);

  const input = await readJson(request, changePasswordSchema);
  await changePassword(user.id, user.sessionId, input.currentPassword, input.newPassword);

  return ok({ changed: true });
});
