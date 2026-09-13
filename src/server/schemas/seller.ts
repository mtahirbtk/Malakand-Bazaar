import { z } from "zod";
import { numeric, optionalText, paginationSchema, slugSchema, text } from "../http/validate";
import { phoneSchema } from "./auth";

/**
 * Request shapes for /api/seller/* (the seller workspace — Phase 6).
 */

// ---------------------------------------------------------------------------
// Profile — PATCH /api/seller/me
// ---------------------------------------------------------------------------

const coordinatesSchema = z.object({
  // Pakistan's bounds, same guard as registerSellerSchema — a mis-wired map
  // pin cannot drop a store in the sea.
  lat: z.number().min(23).max(38),
  lng: z.number().min(60).max(78),
});

/**
 * Deliberately has no `slug` field. §1.4: the slug is not user-editable after
 * creation because storefront URLs must not rot. If a client sends one
 * anyway, `readJson` drops it silently (zod strips unknown-to-schema keys by
 * default) rather than erroring — the UI simply never offers the field.
 */
export const updateSellerSchema = z
  .object({
    storeName: text(2, 80).optional(),
    description: optionalText(2000),
    storePhone: phoneSchema.optional(),
    tehsilSlug: slugSchema.optional(),
    localitySlug: slugSchema.optional(),
    coordinates: coordinatesSchema.optional(),
    avatarPath: z.union([z.literal(""), z.string().max(300)]).optional(),
    bannerPath: z.union([z.literal(""), z.string().max(300)]).optional(),
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), {
    message: "Nothing to update.",
  })
  .refine((v) => v.tehsilSlug === undefined || v.localitySlug !== undefined, {
    message: "Choose a market or area for the new tehsil.",
    path: ["localitySlug"],
  });

export type UpdateSellerInput = z.infer<typeof updateSellerSchema>;

// ---------------------------------------------------------------------------
// Listings — /api/seller/listings*
// ---------------------------------------------------------------------------

export const LISTING_STATUSES = ["active", "reserved", "sold", "removed"] as const;
export type ListingStatusValue = (typeof LISTING_STATUSES)[number];

export const sellerListingsQuerySchema = z
  .object({
    status: z.enum(LISTING_STATUSES).optional(),
    q: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined)),
    sort: z.enum(["newest", "oldest", "price_low", "price_high", "views"]).default("newest"),
  })
  .merge(paginationSchema);

export type SellerListingsQuery = z.infer<typeof sellerListingsQuerySchema>;

/** Shared by create and update; update makes every field optional below. */
const listingFieldsSchema = {
  title: text(4, 140),
  description: text(10, 5000),
  price: numeric({ min: 0.01, max: 9999999999 }),
  compareAtPrice: z.union([numeric({ min: 0.01, max: 9999999999 }), z.null()]).optional(),
  categorySlug: slugSchema,
  subcategorySlug: z.union([slugSchema, z.literal("")]).optional(),
  tehsilSlug: slugSchema,
  localitySlug: slugSchema,
  contactPhone: phoneSchema,
  coordinates: coordinatesSchema.optional(),
  // Object paths of already-committed, not-yet-attached uploads (kind
  // "listing"), in display order. See src/server/services/uploads.ts.
  images: z.array(z.string().max(300)).max(12).default([]),
};

export const createListingSchema = z
  .object(listingFieldsSchema)
  .refine((v) => v.compareAtPrice == null || v.compareAtPrice > v.price, {
    message: "The original price must be higher than the asking price.",
    path: ["compareAtPrice"],
  });

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = z
  .object({
    title: listingFieldsSchema.title.optional(),
    description: listingFieldsSchema.description.optional(),
    price: listingFieldsSchema.price.optional(),
    compareAtPrice: listingFieldsSchema.compareAtPrice,
    categorySlug: listingFieldsSchema.categorySlug.optional(),
    subcategorySlug: listingFieldsSchema.subcategorySlug,
    tehsilSlug: listingFieldsSchema.tehsilSlug.optional(),
    localitySlug: listingFieldsSchema.localitySlug.optional(),
    contactPhone: listingFieldsSchema.contactPhone.optional(),
    coordinates: listingFieldsSchema.coordinates,
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), {
    message: "Nothing to update.",
  })
  .refine((v) => v.compareAtPrice == null || v.price == null || v.compareAtPrice > v.price, {
    message: "The original price must be higher than the asking price.",
    path: ["compareAtPrice"],
  });

export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const updateListingStatusSchema = z.object({
  status: z.enum(LISTING_STATUSES),
});

export const reorderImagesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(12),
});

// ---------------------------------------------------------------------------
// Analytics — GET /api/seller/analytics
// ---------------------------------------------------------------------------

export const sellerAnalyticsQuerySchema = z.object({
  days: z
    .union([z.literal("30"), z.literal("90")])
    .default("30")
    .transform((v) => Number(v) as 30 | 90),
});
