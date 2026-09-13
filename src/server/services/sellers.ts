import "server-only";
import { db, PG } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { hashPassword } from "../auth/password";
import { cloudinaryUrl } from "../storage";
import { initialsFromName } from "@/lib/seller-display";
import { deleteStorageObjects, forgetPendingUpload } from "./uploads";
import type { RegisterSellerInput } from "../schemas/auth";
import type { UpdateSellerInput } from "../schemas/seller";
import type { SellersDirectoryQuery, TopSellersQuery } from "../schemas/sellers-directory";
import type { PublicUser } from "./auth";
import type { Seller, TehsilSlug } from "@/types";

/**
 * Becoming a seller.
 *
 * Handles both entry points in one call, because the UI offers both from the
 * same form: a signed-in customer upgrading, and a brand-new visitor who fills
 * in the store details and their credentials together.
 */

export type SellerSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string;
  tehsilSlug: string | null;
  localitySlug: string | null;
  localityLabel: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  listingCount: number;
  avatarPath: string | null;
  bannerPath: string | null;
  createdAt: string;
};

/** getSellerById's shape, plus what only the owner needs — coordinates and ready-to-render photo URLs. */
export type SellerPrivateSummary = SellerSummary & {
  coordinates: { lat: number; lng: number } | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

const SELLER_COLUMNS =
  "id, slug, name, description, phone, tehsil_slug, locality_slug, locality_label, verified, rating_avg, rating_count, listing_count, avatar_path, banner_path, created_at";

type SellerRow = {
  id: string; slug: string; name: string; description: string | null; phone: string;
  tehsil_slug: string | null; locality_slug: string | null; locality_label: string | null;
  verified: boolean; rating_avg: number; rating_count: number; listing_count: number;
  avatar_path: string | null; banner_path: string | null; created_at: string;
};

export function toSellerSummary(row: SellerRow): SellerSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    phone: row.phone,
    tehsilSlug: row.tehsil_slug,
    localitySlug: row.locality_slug,
    localityLabel: row.locality_label,
    verified: row.verified,
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    listingCount: row.listing_count,
    avatarPath: row.avatar_path,
    bannerPath: row.banner_path,
    createdAt: row.created_at,
  };
}

const PUBLIC_SELLER_COLUMNS =
  "id, slug, name, description, phone, tehsil_slug, locality_label, verified, rating_avg, rating_count, response_minutes, listing_count, avatar_path, banner_path, created_at";

type PublicSellerRow = {
  id: string; slug: string; name: string; description: string | null; phone: string;
  tehsil_slug: string | null; locality_label: string | null; verified: boolean;
  rating_avg: number; rating_count: number; response_minutes: number; listing_count: number;
  avatar_path: string | null; banner_path: string | null; created_at: string;
};

function toPublicSeller(row: PublicSellerRow): Seller {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    initials: initialsFromName(row.name),
    tehsilSlug: (row.tehsil_slug ?? "batkhela") as TehsilSlug,
    localityLabel: row.locality_label ?? "",
    rating: Number(row.rating_avg),
    reviewCount: row.rating_count,
    verified: row.verified,
    responseMinutes: row.response_minutes,
    listingCount: row.listing_count,
    phone: row.phone,
    description: row.description ?? undefined,
    avatarUrl: row.avatar_path ? cloudinaryUrl(row.avatar_path) : undefined,
    storefrontBanner: row.banner_path ? cloudinaryUrl(row.banner_path) : undefined,
    memberSince: row.created_at,
  };
}

/** Resolves a locality slug to its display label, and checks it belongs to the tehsil. */
export async function resolveLocality(tehsilSlug: string, localitySlug: string): Promise<string> {
  const { data } = await db
    .from("localities")
    .select("name_en, tehsil_slug")
    .eq("slug", localitySlug)
    .maybeSingle();

  if (!data) {
    throw ApiError.validation("Choose a market or area from the list.", {
      localitySlug: "Choose a market or area from the list.",
    });
  }
  if (data.tehsil_slug !== tehsilSlug) {
    throw ApiError.validation("That area is not in the selected tehsil.", {
      localitySlug: "That area is not in the selected tehsil.",
    });
  }
  return data.name_en;
}

export type RegisterSellerResult = { sellerId: string; slug: string; userId: string; created: boolean };

export async function registerSeller(
  input: RegisterSellerInput,
  existingUser: PublicUser | null
): Promise<RegisterSellerResult> {
  let userId: string;
  let createdUser = false;

  if (existingUser) {
    if (existingUser.sellerId) {
      throw ApiError.conflict("This account already has a storefront.");
    }
    userId = existingUser.id;
  } else {
    // A signed-out caller must supply credentials; the schema allows them to be
    // absent for the signed-in path, so the pairing is checked here.
    if (!input.phone || !input.password) {
      throw ApiError.validation("Enter a mobile number and password to create your account.", {
        ...(input.phone ? {} : { phone: "Enter your mobile number." }),
        ...(input.password ? {} : { password: "Choose a password." }),
      });
    }

    const { data, error } = await db
      .from("users")
      .insert({
        phone: input.phone,
        password_hash: await hashPassword(input.password),
        display_name: input.storeName,
        role: "customer",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === PG.UNIQUE_VIOLATION) {
        throw ApiError.conflict("That number already has an account. Sign in first, then register your store.", {
          phone: "This number is already registered.",
        });
      }
      throw new ApiError("INTERNAL", "Could not create the account. Please try again.");
    }
    userId = data.id;
    createdUser = true;
  }

  const localityLabel = await resolveLocality(input.tehsilSlug, input.localitySlug);

  const { data: slugRow, error: slugError } = await db.rpc("fn_unique_seller_slug", {
    p_name: input.storeName,
  });
  if (slugError) throw new ApiError("INTERNAL", "Could not create the storefront.");

  const { data: seller, error: sellerError } = await db
    .from("sellers")
    .insert({
      user_id: userId,
      slug: slugRow as unknown as string,
      name: input.storeName,
      description: input.description ?? null,
      phone: input.storePhone,
      tehsil_slug: input.tehsilSlug,
      locality_slug: input.localitySlug,
      locality_label: localityLabel,
      coordinates: input.coordinates
        ? `SRID=4326;POINT(${input.coordinates.lng} ${input.coordinates.lat})`
        : null,
      avatar_path: input.avatarPath ?? null,
      banner_path: input.bannerPath ?? null,
    })
    .select("id, slug")
    .single();

  if (sellerError) {
    if (sellerError.code === PG.UNIQUE_VIOLATION) {
      throw ApiError.conflict("This account already has a storefront.");
    }
    log.error("seller insert failed", { code: sellerError.code, message: sellerError.message });
    throw new ApiError("INTERNAL", "Could not create the storefront. Please try again.");
  }

  // The role change is what the next access token will carry.
  await db.from("users").update({ role: "seller" }).eq("id", userId);

  log.info("seller registered", { userId, sellerId: seller.id });
  return { sellerId: seller.id, slug: seller.slug, userId, created: createdUser };
}

export async function getSellerById(sellerId: string): Promise<SellerSummary | null> {
  const { data } = await db.from("sellers").select(SELLER_COLUMNS).eq("id", sellerId).maybeSingle();
  return data ? toSellerSummary(data as SellerRow) : null;
}

/**
 * `/seller/[slug]` storefront header — §2.4 #27. Was a stand-in
 * (`getPublicSellerBySlug`) built ahead of this phase; now the real thing —
 * same query, routed through the shared `toPublicSeller` mapper so it always
 * matches what `listSellers`/`topSellers` return.
 */
export async function getSellerDetail(slug: string): Promise<Seller | null> {
  const { data } = await db
    .from("sellers")
    .select(PUBLIC_SELLER_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  return data ? toPublicSeller(data as PublicSellerRow) : null;
}

/** @deprecated Use getSellerDetail — this alias exists only until Task 11 updates its one caller. */
export const getPublicSellerBySlug = getSellerDetail;

/**
 * GET/PATCH /api/seller/me. Unlike getSellerById (used for anything read
 * generically), this goes through fn_seller_private (0019) because a plain
 * REST select of a `geography` column returns raw WKB hex, not {lat,lng}.
 */
export async function getSellerPrivate(sellerId: string): Promise<SellerPrivateSummary | null> {
  const { data, error } = await db.rpc("fn_seller_private", { p_seller_id: sellerId });
  if (error) {
    log.error("fn_seller_private failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your storefront. Please try again.");
  }
  if (!data) return null;

  const row = data as SellerSummary & { coordinates: { lat: number; lng: number } | null };
  return {
    ...row,
    avatarUrl: row.avatarPath ? cloudinaryUrl(row.avatarPath) : null,
    bannerUrl: row.bannerPath ? cloudinaryUrl(row.bannerPath) : null,
  };
}

/**
 * `/sellers` directory — §2.4 #26. Plain filtered/sorted/paginated read, no
 * facets (unlike GET /api/listings, this list doesn't need them) — matches
 * the pattern in seller-listings.ts's listSellerListings rather than the RPC
 * pattern reserved for the heavy search/home reads (§1.4).
 */
export async function listSellers(query: SellersDirectoryQuery): Promise<{ items: Seller[]; total: number }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  let builder = db.from("sellers").select(PUBLIC_SELLER_COLUMNS, { count: "exact" }).eq("status", "active");

  if (query.tehsil) builder = builder.eq("tehsil_slug", query.tehsil);
  if (query.verifiedOnly) builder = builder.eq("verified", true);
  if (query.q) builder = builder.ilike("name", `%${query.q}%`);
  if (query.category) {
    // A seller has no category of its own — "sells in this category" means
    // "has at least one live listing in it". A subquery keeps this to one
    // round trip instead of fetching every seller id first.
    const { data: sellerIds } = await db
      .from("listings")
      .select("seller_id")
      .eq("category_slug", query.category)
      .eq("status", "active")
      .is("deleted_at", null);
    const ids = [...new Set((sellerIds ?? []).map((r) => r.seller_id))];
    if (ids.length === 0) return { items: [], total: 0 };
    builder = builder.in("id", ids);
  }

  const [column, ascending] = (
    { rating: ["rating_score", false], newest: ["created_at", false], listings: ["listing_count", false] } as const
  )[query.sort];

  const { data, error, count } = await builder.order(column, { ascending }).range(from, to);
  if (error) {
    log.error("listSellers failed", { message: error.message });
    throw new ApiError("INTERNAL", "Could not load sellers. Please try again.");
  }

  return { items: (data as PublicSellerRow[] ?? []).map(toPublicSeller), total: count ?? 0 };
}

/**
 * Homepage top-sellers widget — §2.4 #30. `getSellerDetail`'s DB query with
 * a rating floor and a hard limit instead of a slug lookup.
 */
export async function topSellers(query: TopSellersQuery): Promise<Seller[]> {
  const { data, error } = await db
    .from("sellers")
    .select(PUBLIC_SELLER_COLUMNS)
    .eq("status", "active")
    .gte("rating_count", 1)
    .order("rating_score", { ascending: false })
    .order("rating_count", { ascending: false })
    .limit(query.limit);

  if (error) {
    log.error("topSellers failed", { message: error.message });
    throw new ApiError("INTERNAL", "Could not load top sellers. Please try again.");
  }
  return (data as PublicSellerRow[] ?? []).map(toPublicSeller);
}

/**
 * Confirms a photo path is one this seller uploaded and committed, and that
 * it is the kind the caller says it is — a customer cannot set their avatar
 * to a path lifted from someone else's committed upload, and a "listing"
 * upload cannot be slipped in as an avatar. Empty string means "clear it".
 */
async function resolveProfilePhotoPath(
  sellerId: string,
  kind: "avatar" | "banner",
  path: string | undefined
): Promise<string | null | undefined> {
  if (path === undefined) return undefined;
  if (path === "") return null;

  const { data } = await db
    .from("pending_uploads")
    .select("kind, committed_at")
    .eq("path", path)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (!data || data.kind !== kind || !data.committed_at) {
    throw ApiError.validation("Upload that photo before saving.", {
      [kind === "avatar" ? "avatarPath" : "bannerPath"]: "Upload that photo before saving.",
    });
  }
  return path;
}

/**
 * Profile edit. §1.4 / Phase 6 endpoint 41 — everything except the slug
 * (immutable after creation, and simply not accepted by the schema).
 */
export async function updateSeller(sellerId: string, input: UpdateSellerInput): Promise<SellerPrivateSummary> {
  const current = await getSellerById(sellerId);
  if (!current) throw ApiError.notFound("Your storefront");

  const patch: Record<string, unknown> = {};
  if (input.storeName !== undefined) patch.name = input.storeName;
  // "" clears it — optionalPatchText keeps an empty string as "" rather than
  // collapsing it to undefined, exactly so this can tell "not sent" from
  // "cleared" apart. || null (not ??) turns that "" into a real null.
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.storePhone !== undefined) patch.phone = input.storePhone;

  // The schema's refine() guarantees localitySlug is present whenever
  // tehsilSlug is, so this narrows rather than defaults.
  if (input.tehsilSlug !== undefined && input.localitySlug !== undefined) {
    const localityLabel = await resolveLocality(input.tehsilSlug, input.localitySlug);
    patch.tehsil_slug = input.tehsilSlug;
    patch.locality_slug = input.localitySlug;
    patch.locality_label = localityLabel;
  }

  if (input.coordinates !== undefined) {
    patch.coordinates = `SRID=4326;POINT(${input.coordinates.lng} ${input.coordinates.lat})`;
  }

  const nextAvatarPath = await resolveProfilePhotoPath(sellerId, "avatar", input.avatarPath);
  if (nextAvatarPath !== undefined) patch.avatar_path = nextAvatarPath;

  const nextBannerPath = await resolveProfilePhotoPath(sellerId, "banner", input.bannerPath);
  if (nextBannerPath !== undefined) patch.banner_path = nextBannerPath;

  const { error } = await db.from("sellers").update(patch).eq("id", sellerId);

  if (error) {
    log.error("seller update failed", { sellerId, code: error.code, message: error.message });
    throw new ApiError("INTERNAL", "Could not save your storefront. Please try again.");
  }

  // Only now that the row points at the new photo (or none) is the old
  // object safe to delete, and only if it actually changed.
  const cleanup: string[] = [];
  if (nextAvatarPath !== undefined && current.avatarPath && current.avatarPath !== nextAvatarPath) {
    cleanup.push(current.avatarPath);
  }
  if (nextBannerPath !== undefined && current.bannerPath && current.bannerPath !== nextBannerPath) {
    cleanup.push(current.bannerPath);
  }
  if (cleanup.length) await deleteStorageObjects(cleanup);

  if (nextAvatarPath) await forgetPendingUpload(nextAvatarPath);
  if (nextBannerPath) await forgetPendingUpload(nextBannerPath);

  // Re-read through fn_seller_private rather than .select().single() on the
  // update itself, so the response carries real {lat,lng} instead of the raw
  // WKB hex a plain REST select of `coordinates` would return.
  const updated = await getSellerPrivate(sellerId);
  if (!updated) throw new ApiError("INTERNAL", "Could not save your storefront. Please try again.");
  return updated;
}
