"use client";

import { api } from "./api-client";

/**
 * The client half of the upload pipeline (docs/backend-plan.md §1.3, updated
 * for Cloudinary): sign, POST straight to Cloudinary, commit. Mirrors
 * src/server/services/uploads.ts — that file's doc comment has the full
 * picture of what commit() actually checks.
 */

export type UploadKind = "listing" | "avatar" | "banner";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 5 * 1024 * 1024;

export class UploadValidationError extends Error {}

/** Fails fast on an obviously bad file — the server re-checks the real bytes regardless. */
export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadValidationError("Photos must be JPEG, PNG, WebP or AVIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadValidationError("Photos must be 5 MB or smaller.");
  }
}

export type UploadedImage = { path: string; url: string; width: number; height: number };

type SignedUpload = { publicId: string; uploadUrl: string; formFields: Record<string, string> };

/**
 * Uploads one file end to end. Passing `listingId` attaches it to that
 * listing immediately (the edit-page path); omitting it leaves the upload
 * committed-but-unattached, for a new listing's `images` array to reference
 * by path once the listing itself is created.
 */
export async function uploadSellerImage(
  file: File,
  kind: UploadKind,
  listingId?: string
): Promise<UploadedImage> {
  validateImageFile(file);

  const signed = await api.post<SignedUpload>("/api/uploads/sign", {
    kind,
    contentType: file.type,
    size: file.size,
  });

  const form = new FormData();
  for (const [key, value] of Object.entries(signed.formFields)) form.append(key, value);
  form.append("file", file);

  const uploadResponse = await fetch(signed.uploadUrl, { method: "POST", body: form });
  const uploadResult = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok) {
    throw new Error(uploadResult?.error?.message || "Could not upload that photo. Please try again.");
  }

  return api.post<UploadedImage>("/api/uploads/commit", { path: signed.publicId, listingId });
}
