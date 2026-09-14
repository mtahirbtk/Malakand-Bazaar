import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { enforceIpRateLimit } from "@/server/http/rate-limit";
import { phoneAvailableSchema } from "@/server/schemas/auth";
import { isPhoneAvailable } from "@/server/services/auth";
import { enforceCsrf } from "@/server/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signup convenience: tells the form whether a number is taken before the user
 * fills in the rest.
 *
 * This is the one endpoint that intentionally leaks registration state, which
 * is why it is a POST (never logged in a referer or proxy URL), rate limited
 * far harder than anything else, and returns only a boolean. Without it people
 * submit a full form to be told the number is taken; with the limit in place,
 * enumerating the Pakistani mobile range through it is not practical.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  await enforceIpRateLimit("phoneProbe", request);

  const { phone } = await readJson(request, phoneAvailableSchema);
  return ok({ available: await isPhoneAvailable(phone) }, { headers: { "Cache-Control": "no-store" } });
});
