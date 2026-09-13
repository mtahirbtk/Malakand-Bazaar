import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

/**
 * Media storage — Cloudinary, not Supabase Storage.
 *
 * The pipeline is still sign → browser upload → commit (docs/backend-plan.md
 * §1.3), but the middle step changes shape: instead of a Storage-native
 * signed PUT URL, the browser POSTs the file straight to Cloudinary's own
 * upload endpoint with a set of params this server signed. Cloudinary
 * enforces the format allow-list and re-orients/re-encodes the asset
 * (stripping the original EXIF as a side effect) as part of accepting the
 * upload — see uploads.ts for the full pipeline and what commit() still
 * re-verifies itself rather than trusting the client's word for it.
 *
 * Bytes never pass through this server either way: the browser uploads
 * directly to Cloudinary, same as it PUT directly to Supabase Storage
 * before.
 */

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
