import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { signUploadSchema } from "@/server/schemas/uploads";
import { signUpload } from "@/server/services/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * { kind, contentType, size } → a Storage-native signed upload URL + object
 * path (§2.8 #51). The browser PUTs directly to `signedUrl`; bytes never
 * reach this server. See src/server/services/uploads.ts for the full pipeline.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("upload", sub);

  const input = await readJson(request, signUploadSchema);
  const signed = await signUpload(sellerId, input);

  return ok(signed, { status: 201 });
});
