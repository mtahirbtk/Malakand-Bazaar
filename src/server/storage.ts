import "server-only";
import { env } from "./env";

/**
 * Turns a Cloudinary public_id (what `listing_images.path`,
 * `sellers.avatar_path` and `sellers.banner_path` store — the column names
 * are unchanged from the Supabase Storage version; a Cloudinary public_id is
 * every bit as much an opaque "path to the asset" as an object key was) into
 * the delivery URL the browser fetches.
 *
 * No transformation segment: this is the plain original asset. A resized or
 * cropped variant would insert one (e.g. `.../upload/w_400,h_400,c_fill/...`)
 * — none of today's call sites need that yet.
 */
export function cloudinaryUrl(publicId: string): string {
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
}
