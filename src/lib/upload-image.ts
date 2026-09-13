"use client";

import { api } from "./api-client";

/**
 * The client half of the upload pipeline (docs/backend-plan.md §1.3): sign,
 * PUT straight to Storage, commit. Mirrors src/server/services/uploads.ts —
 * that file's doc comment has the full picture of what commit() actually
 * checks.
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

  const signed = await api.post<{ path: string; signedUrl: string; token: string }>("/api/uploads/sign", {
    kind,
    contentType: file.type,
    size: file.size,
  });

  const putResponse = await fetch(signed.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putResponse.ok) {
    throw new Error("Could not upload that photo. Please try again.");
  }

  return api.post<UploadedImage>("/api/uploads/commit", { path: signed.path, listingId });
}
