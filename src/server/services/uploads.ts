import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { env } from "../env";
import { publicStorageUrl } from "../storage";
import type { CommitUploadInput, SignUploadInput, UploadKind } from "../schemas/uploads";
import { MAX_UPLOAD_BYTES } from "../schemas/uploads";

/**
 * The upload pipeline. §1.3 / Phase 6.
 *
 * Three steps, two of them here:
 *   1. sign()   — POST /api/uploads/sign. Issues a Storage-native signed
 *                 upload URL scoped to one object path; the browser PUTs the
 *                 raw bytes straight to it (see docs/backend-plan.md §1.3 —
 *                 they never pass through this server).
 *   2. (browser) fetch(signedUrl, { method: "PUT", body: file })
 *   3. commit() — POST /api/uploads/commit. The one point that actually looks
 *                 at the bytes.
 *
 * commit() is where every safety property the plan asks for actually lives:
 *   - "real" MIME, not the client's declared Content-Type: sharp decodes the
 *     object and reports the format it *found*. A renamed .exe or an SVG
 *     (XSS risk, deliberately not in the allow-list) fails to decode as one
 *     of the four raster formats and is rejected — the declared contentType
 *     on the signed URL is a UX hint, never trusted as fact.
 *   - EXIF strip: sharp's default output carries no metadata unless
 *     `.withMetadata()` is called, which it never is here. `.rotate()` with
 *     no argument bakes in the EXIF orientation (so a sideways phone photo
 *     still displays upright with the orientation tag gone) before that
 *     metadata is dropped.
 *   - real dimensions: read from the same decode, not trusted from the client.
 *
 * One dependency (`sharp`) buys all three instead of hand-rolling a
 * magic-byte sniffer, a separate dimension reader and an EXIF stripper — it
 * is already in the dependency tree (Next's own image optimizer uses it) and
 * is the standard choice for server-side image work on Node/Vercel.
 */

const EXTENSION: Record<SignUploadInput["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Formats sharp/libvips may report for our four allowed content types. */
const ACCEPTED_SHARP_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);

/**
 * The real bytes decide the Content-Type header, not the client's declared
 * one from /api/uploads/sign — a caller could sign for "image/png" and PUT a
 * JPEG; sharp's decode tells us what it actually is.
 */
const SHARP_FORMAT_TO_CONTENT_TYPE: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heif: "image/avif",
};

const MAX_DIMENSION = 8000;

function objectPath(sellerId: string, kind: UploadKind, contentType: SignUploadInput["contentType"]): string {
  const id = randomUUID();
  return `sellers/${sellerId}/${kind}/${id}.${EXTENSION[contentType]}`;
}

export type SignedUpload = { path: string; signedUrl: string; token: string };

export async function signUpload(sellerId: string, input: SignUploadInput): Promise<SignedUpload> {
  const path = objectPath(sellerId, input.kind, input.contentType);

  const { data, error } = await db.storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    log.error("createSignedUploadUrl failed", { message: error?.message });
    throw new ApiError("INTERNAL", "Could not prepare the upload. Please try again.");
  }

  const { error: insertError } = await db.from("pending_uploads").insert({
    path,
    seller_id: sellerId,
    kind: input.kind,
    content_type: input.contentType,
    bytes: input.size,
  });
  if (insertError) {
    log.error("pending_uploads insert failed", { message: insertError.message });
    throw new ApiError("INTERNAL", "Could not prepare the upload. Please try again.");
  }

  return { path, signedUrl: data.signedUrl, token: data.token };
}

export type CommittedUpload = { path: string; url: string; width: number; height: number };

type PendingUploadRow = {
  path: string;
  seller_id: string;
  kind: UploadKind;
  content_type: SignUploadInput["contentType"];
  width: number | null;
  height: number | null;
  bytes: number | null;
  committed_at: string | null;
};

async function findOwnPendingUpload(sellerId: string, path: string): Promise<PendingUploadRow> {
  // The path itself is namespaced `sellers/{sellerId}/...`, but the row is the
  // authority: it is only ever inserted by sign() for the caller who signed
  // it, so a forged path with someone else's id in it simply has no row here.
  const { data } = await db
    .from("pending_uploads")
    .select("path, seller_id, kind, content_type, width, height, bytes, committed_at")
    .eq("path", path)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (!data) throw ApiError.notFound("That upload");
  return data as PendingUploadRow;
}

/**
 * Confirms `path` is this seller's own, already-committed "listing" upload,
 * without touching a listing row — the pre-flight half of attachListingImage,
 * so createListing() can validate every path in a new listing's `images`
 * array *before* inserting the listing row. Skipping this and only
 * discovering a bad path via attachListingImage (after the insert) would
 * leave a real listing behind while the client is told creation failed.
 */
export async function assertOwnCommittedListingUpload(sellerId: string, path: string): Promise<void> {
  const pending = await findOwnPendingUpload(sellerId, path);
  if (pending.kind !== "listing" || !pending.committed_at) {
    throw ApiError.validation("Upload that photo before attaching it to a listing.");
  }
}

/** Re-encodes the object in place: auto-oriented, EXIF stripped, dimensions verified. */
async function processAndReplace(path: string): Promise<{ width: number; height: number; bytes: number }> {
  const { data: blob, error: downloadError } = await db.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .download(path);
  if (downloadError || !blob) {
    throw ApiError.validation("That photo could not be found. Upload it again.");
  }

  const original = Buffer.from(await blob.arrayBuffer());
  if (original.byteLength > MAX_UPLOAD_BYTES) {
    throw ApiError.validation("Photos must be 5 MB or smaller.");
  }

  let format: string | undefined;
  try {
    format = (await sharp(original, { failOn: "error" }).metadata()).format;
  } catch {
    throw ApiError.validation("That file is not a photo we can use.");
  }

  if (!format || !ACCEPTED_SHARP_FORMATS.has(format)) {
    throw ApiError.validation("Photos must be JPEG, PNG, WebP or AVIF.");
  }

  const { data: processed, info } = await sharp(original, { failOn: "error" })
    .rotate() // bakes in EXIF orientation, then metadata (incl. GPS) is dropped
    .toBuffer({ resolveWithObject: true });

  if (info.width > MAX_DIMENSION || info.height > MAX_DIMENSION) {
    throw ApiError.validation(`Photos must be ${MAX_DIMENSION}px or smaller on each side.`);
  }

  const realContentType = SHARP_FORMAT_TO_CONTENT_TYPE[format] ?? "application/octet-stream";
  const { error: uploadError } = await db.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, processed, { upsert: true, contentType: realContentType });
  if (uploadError) {
    log.error("re-upload after processing failed", { path, message: uploadError.message });
    throw new ApiError("INTERNAL", "Could not process that photo. Please try again.");
  }

  return { width: info.width, height: info.height, bytes: processed.byteLength };
}

/**
 * Verifies, strips, and records one uploaded object. Idempotent: calling it
 * again for an already-committed path just returns the stored result rather
 * than re-downloading and re-processing.
 */
export async function commitUpload(sellerId: string, input: CommitUploadInput): Promise<CommittedUpload> {
  const pending = await findOwnPendingUpload(sellerId, input.path);

  let width = pending.width;
  let height = pending.height;

  if (!pending.committed_at) {
    const result = await processAndReplace(pending.path);
    width = result.width;
    height = result.height;

    const { error } = await db
      .from("pending_uploads")
      .update({ width: result.width, height: result.height, bytes: result.bytes, committed_at: new Date().toISOString() })
      .eq("path", pending.path);
    if (error) log.warn("pending_uploads commit stamp failed", { path: pending.path, message: error.message });
  }

  if (pending.kind === "listing" && input.listingId) {
    await attachListingImage(sellerId, input.listingId, pending.path);
  }

  return { path: pending.path, url: publicStorageUrl(pending.path), width: width ?? 0, height: height ?? 0 };
}

/**
 * Inserts one listing_images row and forgets the pending_uploads row. Used by
 * commit() when a listingId is already known, and directly by
 * seller-listings.ts to attach the paths a create/update-listing call sends
 * — either way `path` is re-verified as this seller's own committed
 * "listing" upload, never trusted just because the caller supplied it.
 */
export async function attachListingImage(sellerId: string, listingId: string, path: string): Promise<void> {
  const pending = await findOwnPendingUpload(sellerId, path);
  if (pending.kind !== "listing" || !pending.committed_at) {
    throw ApiError.validation("Upload that photo before attaching it to a listing.");
  }

  const { data: listing } = await db.from("listings").select("id, seller_id").eq("id", listingId).maybeSingle();
  if (!listing || listing.seller_id !== sellerId) throw ApiError.notFound("That listing");

  const { count } = await db
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if ((count ?? 0) >= 12) {
    throw ApiError.validation("A listing can have at most 12 photos.");
  }

  const { error } = await db
    .from("listing_images")
    .insert({
      listing_id: listingId,
      path,
      sort: count ?? 0,
      width: pending.width,
      height: pending.height,
      bytes: pending.bytes,
    });
  if (error) {
    log.error("listing_images insert failed", { listingId, message: error.message });
    throw new ApiError("INTERNAL", "Could not attach that photo. Please try again.");
  }

  await forgetPendingUpload(path);
}

/** Deletes the ledger row for a path that is now referenced elsewhere (attached), so the sweep leaves it alone. */
export async function forgetPendingUpload(path: string): Promise<void> {
  const { error } = await db.from("pending_uploads").delete().eq("path", path);
  if (error) log.warn("pending_uploads delete failed", { path, message: error.message });
}

/** Best-effort Storage delete — callers proceed regardless (a leaked object costs storage, not correctness). */
export async function deleteStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await db.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(paths);
  if (error) log.warn("storage remove failed", { paths, message: error.message });
}

/** A signed URL nobody ever PUT to — swept quickly; it costs nothing to keep trying. */
const SIGNED_NOT_UPLOADED_GRACE_MS = 2 * 60 * 60 * 1000;
/** A committed photo never attached to a listing or profile field — a longer grace window so an in-progress draft isn't punished. */
const COMMITTED_NOT_ATTACHED_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * The Node half of orphan cleanup — Storage object deletion needs the JS SDK,
 * so this can't be the pg_cron job 0009 uses for everything else. Driven by
 * an authenticated route (CRON_SECRET), same fallback shape as the rank
 * refresh. Safe to run as often as convenient: every row it touches is, by
 * definition, not referenced by any listing or seller profile field.
 */
export async function sweepPendingUploads(): Promise<{ swept: number }> {
  const now = Date.now();
  const uncommittedCutoff = new Date(now - SIGNED_NOT_UPLOADED_GRACE_MS).toISOString();
  const committedCutoff = new Date(now - COMMITTED_NOT_ATTACHED_GRACE_MS).toISOString();

  const { data, error } = await db
    .from("pending_uploads")
    .select("path")
    .or(
      `and(committed_at.is.null,created_at.lt.${uncommittedCutoff}),and(committed_at.not.is.null,committed_at.lt.${committedCutoff})`
    )
    .limit(500);

  if (error) {
    log.error("sweepPendingUploads query failed", { message: error.message });
    return { swept: 0 };
  }
  if (!data || data.length === 0) return { swept: 0 };

  const paths = data.map((row) => row.path as string);
  await deleteStorageObjects(paths);

  const { error: deleteError } = await db.from("pending_uploads").delete().in("path", paths);
  if (deleteError) log.warn("pending_uploads sweep delete failed", { message: deleteError.message });

  log.info("swept orphaned uploads", { count: paths.length });
  return { swept: paths.length };
}

export const _internal = { objectPath, EXTENSION, ACCEPTED_SHARP_FORMATS };
