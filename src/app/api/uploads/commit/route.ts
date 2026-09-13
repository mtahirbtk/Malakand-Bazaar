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
 * Confirms the asset actually exists and re-reads its real dimensions/size
 * from Cloudinary's own record (§2.8 #52) — never the client's word for it.
 * See src/server/services/uploads.ts for what Cloudinary already enforced at
 * upload time (format allow-list, EXIF strip) versus what this still checks.
 */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const { sellerId, sub } = await requireSeller();
  await enforceRateLimit("upload", sub);

  const input = await readJson(request, commitUploadSchema);
  const committed = await commitUpload(sellerId, input);

  return ok(committed);
});
