import "server-only";
import { randomUUID } from "node:crypto";
import { cloudinary } from "../cloudinary";
import { db } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { cloudinaryUrl } from "../storage";
import type { CommitUploadInput, SignUploadInput, UploadKind } from "../schemas/uploads";
import { MAX_UPLOAD_BYTES } from "../schemas/uploads";

/**
 * The upload pipeline. §1.3 / Phase 6 — Cloudinary edition.
 *
 * Three steps, two of them here:
 *   1. sign()   — POST /api/uploads/sign. Returns a Cloudinary upload
 *                 endpoint plus a set of signed form fields; the browser
 *                 POSTs the file straight there (bytes never pass through
 *                 this server, same as the Supabase Storage version did).
 *   2. (browser) POST multipart/form-data to signed.uploadUrl with
 *                 signed.formFields spread in, plus the file.
 *   3. commit() — POST /api/uploads/commit. Confirms the asset actually
 *                 exists and re-reads its *real* metadata from Cloudinary's
 *                 own record rather than trusting whatever the browser
 *                 echoes back from the upload response.
 *
 * What used to be sharp's job now happens two different ways:
 *   - format allow-list + EXIF strip: enforced BY Cloudinary at upload time.
 *     `allowed_formats` (a signed param — the browser cannot change it
 *     without invalidating the signature) rejects anything that isn't
 *     actually one of our four raster formats, decoded from the real bytes,
 *     not the declared Content-Type. The signed `transformation: "a_exif"`
 *     param is an *incoming* transformation, applied to the stored asset
 *     itself — it bakes in the EXIF-orientation rotation and, because any
 *     transformation forces a re-encode, the re-encoded asset carries none
 *     of the original file's metadata (GPS included).
 *   - real dimensions / size cap: read back from Cloudinary's Admin API
 *     (cloudinary.api.resource) in commit(), never from the client — a
 *     tampered client response claiming false width/height/bytes changes
 *     nothing we store.
 */

const ALLOWED_FORMATS = "jpg,png,webp,avif";
const ACCEPTED_RESOURCE_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif", "heif"]);
const MAX_DIMENSION = 8000;

function publicId(sellerId: string, kind: UploadKind): string {
  return `sellers/${sellerId}/${kind}/${randomUUID()}`;
}

export type SignedUpload = {
  publicId: string;
  uploadUrl: string;
  /** Spread these into the multipart form the browser POSTs, verbatim — every one participated in the signature. */
  formFields: Record<string, string>;
};

export async function signUpload(sellerId: string, input: SignUploadInput): Promise<SignedUpload> {
  const id = publicId(sellerId, input.kind);
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    public_id: id,
    timestamp,
    allowed_formats: ALLOWED_FORMATS,
    transformation: "a_exif",
  };

  let signature: string;
  try {
    signature = cloudinary.utils.api_sign_request(paramsToSign, cloudinary.config().api_secret as string);
  } catch (error) {
    log.error("cloudinary signature failed", { message: error instanceof Error ? error.message : String(error) });
    throw new ApiError("INTERNAL", "Could not prepare the upload. Please try again.");
  }

  const { error: insertError } = await db.from("pending_uploads").insert({
    path: id,
    seller_id: sellerId,
    kind: input.kind,
    content_type: input.contentType,
    bytes: input.size,
  });
  if (insertError) {
    log.error("pending_uploads insert failed", { message: insertError.message });
    throw new ApiError("INTERNAL", "Could not prepare the upload. Please try again.");
  }

  return {
    publicId: id,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.config().cloud_name}/image/upload`,
    formFields: {
      api_key: String(cloudinary.config().api_key),
      timestamp: String(timestamp),
      signature,
      public_id: paramsToSign.public_id,
      allowed_formats: paramsToSign.allowed_formats,
      transformation: paramsToSign.transformation,
    },
  };
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
  // The public_id itself is namespaced `sellers/{sellerId}/...`, but the row
  // is the authority: it is only ever inserted by sign() for the caller who
  // signed it, so a forged id with someone else's id in it simply has no row
  // here.
  const { data } = await db
    .from("pending_uploads")
    .select("path, seller_id, kind, content_type, width, height, bytes, committed_at")
    .eq("path", path)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (!data) throw ApiError.notFound("That upload");
  return data as PendingUploadRow;
}

/** Best-effort Cloudinary delete — callers proceed regardless (a leaked asset costs storage, not correctness). */
export async function deleteStorageObjects(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: "image" });
  } catch (error) {
    log.warn("cloudinary delete_resources failed", {
      publicIds,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Re-reads the asset's real metadata from Cloudinary's own record — never
 * trusting whatever the browser's upload response claimed — and enforces the
 * size/dimension caps that Cloudinary's signed params don't cover.
 */
async function verifyAndReadMetadata(path: string): Promise<{ width: number; height: number; bytes: number }> {
  let resource: { format?: string; width?: number; height?: number; bytes?: number };
  try {
    resource = await cloudinary.api.resource(path, { resource_type: "image" });
  } catch {
    throw ApiError.validation("That photo could not be found. Upload it again.");
  }

  if (!resource.format || !ACCEPTED_RESOURCE_FORMATS.has(resource.format)) {
    await deleteStorageObjects([path]);
    throw ApiError.validation("Photos must be JPEG, PNG, WebP or AVIF.");
  }

  const { width = 0, height = 0, bytes = 0 } = resource;

  if (bytes > MAX_UPLOAD_BYTES) {
    await deleteStorageObjects([path]);
    throw ApiError.validation("Photos must be 5 MB or smaller.");
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    await deleteStorageObjects([path]);
    throw ApiError.validation(`Photos must be ${MAX_DIMENSION}px or smaller on each side.`);
  }

  return { width, height, bytes };
}

/**
 * Verifies, and records, one uploaded asset. Idempotent: calling it again
 * for an already-committed path just returns the stored result rather than
 * re-checking Cloudinary.
 */
export async function commitUpload(sellerId: string, input: CommitUploadInput): Promise<CommittedUpload> {
  const pending = await findOwnPendingUpload(sellerId, input.path);

  let width = pending.width;
  let height = pending.height;

  if (!pending.committed_at) {
    const result = await verifyAndReadMetadata(pending.path);
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

  return { path: pending.path, url: cloudinaryUrl(pending.path), width: width ?? 0, height: height ?? 0 };
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

/** A signed upload nobody ever POSTed to Cloudinary — swept quickly; it costs nothing to keep trying. */
const SIGNED_NOT_UPLOADED_GRACE_MS = 2 * 60 * 60 * 1000;
/** A committed photo never attached to a listing or profile field — a longer grace window so an in-progress draft isn't punished. */
const COMMITTED_NOT_ATTACHED_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * The Node half of orphan cleanup — Cloudinary asset deletion needs its
 * Admin API, so this can't be the pg_cron job 0009 uses for everything else.
 * Driven by an authenticated route (CRON_SECRET), same fallback shape as the
 * rank refresh. Safe to run as often as convenient: every row it touches is,
 * by definition, not referenced by any listing or seller profile field.
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

export const _internal = { publicId, ALLOWED_FORMATS, ACCEPTED_RESOURCE_FORMATS };
