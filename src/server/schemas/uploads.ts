import { z } from "zod";

/**
 * Request shapes for /api/uploads/*.
 *
 * Only these four content types are ever accepted — see
 * `src/server/services/uploads.ts` for why the declared `contentType` here is
 * a hint, not a fact: the real check happens at commit time, by decoding the
 * bytes.
 */

export const UPLOAD_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

export const UPLOAD_KINDS = ["listing", "avatar", "banner"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const signUploadSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  contentType: z.enum(UPLOAD_CONTENT_TYPES, {
    message: "Photos must be JPEG, PNG, WebP or AVIF.",
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, "Photos must be 5 MB or smaller."),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;

export const commitUploadSchema = z.object({
  path: z.string().min(1).max(300),
  // Only meaningful for kind "listing": attaches the image to an existing
  // listing immediately. Omitted while composing a new listing that does not
  // exist yet — the paths travel in the create-listing body instead.
  listingId: z.string().uuid().optional(),
});

export type CommitUploadInput = z.infer<typeof commitUploadSchema>;
