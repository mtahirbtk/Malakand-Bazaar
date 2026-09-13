import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireSeller } from "@/server/auth/guard";
import { commitUploadSchema } from "@/server/schemas/uploads";
import { commitUpload } from "@/server/services/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifies the uploaded object, strips EXIF, records real dimensions
 * (§2.8 #52). The one point in the pipeline that actually looks at the
 * bytes — see src/server/services/uploads.ts.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("upload", sub);

  const input = await readJson(request, commitUploadSchema);
  const committed = await commitUpload(sellerId, input);

  return ok(committed);
});
