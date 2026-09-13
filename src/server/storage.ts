import "server-only";
import { env } from "./env";

/**
 * Turns a Supabase Storage object path (what `listing_images.path` stores)
 * into the public URL the browser actually fetches. The bucket is public
 * read (Phase 6 upload pipeline writes it that way), so no signing needed.
 */
export function publicStorageUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${path}`;
}
