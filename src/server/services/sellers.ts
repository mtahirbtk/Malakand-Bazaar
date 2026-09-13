import "server-only";
import { db, PG } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { hashPassword } from "../auth/password";
import type { RegisterSellerInput } from "../schemas/auth";
import type { PublicUser } from "./auth";

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

/** Resolves a locality slug to its display label, and checks it belongs to the tehsil. */
async function resolveLocality(tehsilSlug: string, localitySlug: string): Promise<string> {
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
